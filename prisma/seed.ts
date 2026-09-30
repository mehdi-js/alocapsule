import { type Prisma, PrismaClient } from "@prisma/client";

import { BUSINESS_SETTING_DEFAULTS } from "@/lib/business-settings";
import { jalaliToDate } from "@/lib/date";
import { HOME_SETTING_DEFAULTS } from "@/lib/home-settings";
import {
  DEFAULT_ORDER_NUMBER_PREFIX,
  ORDER_NUMBER_PREFIX_KEY,
} from "@/lib/order-number";
import { normalizePhone } from "@/lib/phone";
import { SEO_SETTING_DEFAULTS } from "@/lib/seo/settings";

import { catalogCategories, catalogProducts } from "./seed-catalog";
import { bankCard, shippingMethods, smsTemplates } from "./seed-data";
import { seedPages } from "./seed-pages";

const prisma = new PrismaClient();

/**
 * seed قابل تکرار است و ویرایش‌های ادمین را بازنویسی نمی‌کند: رکوردها فقط
 * اگر نبودند ساخته می‌شوند و در رکورد موجود فقط فیلدهای خالی پر می‌شوند.
 */

async function seedAdmin() {
  const raw = process.env.ADMIN_SEED_PHONE ?? "";
  const phone = normalizePhone(raw);
  if (!phone) {
    throw new Error(
      `ADMIN_SEED_PHONE نامعتبر است ("${raw}"). یک شماره‌ی موبایل مثل 09123456789 در .env بگذارید.`,
    );
  }
  await prisma.user.upsert({
    where: { phone },
    create: { phone, fullName: "مدیر سایت", role: "ADMIN" },
    update: { role: "ADMIN", isActive: true },
  });
  return phone;
}

/** فیلدهایی از `data` که در رکورد موجود خالی‌اند (null، "" یا آرایه‌ی خالی) */
function missingFields<T extends Record<string, unknown>>(
  existing: Record<string, unknown>,
  data: T,
): Partial<T> {
  const isEmpty = (value: unknown) =>
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => isEmpty(existing[key]) && !isEmpty(value),
    ),
  ) as Partial<T>;
}

/**
 * کاتالوگ نمونه (`seed-catalog.ts`). محصولات فقط اگر نبودند ساخته می‌شوند
 * (همراه متغیرها)؛ ادمین تصویر را اضافه می‌کند.
 */
async function seedCatalog() {
  const categoryIds = new Map<string, string>();
  for (const { parentSlug, ...category } of catalogCategories) {
    const parentId = parentSlug ? (categoryIds.get(parentSlug) ?? null) : null;
    const data = { ...category, parentId };
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });
    const saved = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: missingFields(existing, data),
        })
      : await prisma.category.create({ data });
    categoryIds.set(saved.slug, saved.id);
  }

  for (const [index, product] of catalogProducts.entries()) {
    const { categorySlug, variants, ...fields } = product;
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) throw new Error(`دسته‌ی ${categorySlug} در seed نیست`);
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
    });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: missingFields(existing, fields),
      });
      continue;
    }
    await prisma.product.create({
      data: {
        ...fields,
        categoryId,
        sortOrder: index + 1,
        variants: {
          create: variants.map((variant, variantIndex) => ({
            ...variant,
            // چند اندازه بدون گروه گزینه (مدل قدیمی) تا بازسازی با گزینه‌ها (P2)
            optionKey:
              variants.length > 1 ? `legacy:${variant.unitValue}` : "default",
            sortOrder: variantIndex + 1,
          })),
        },
      },
    });
  }
}

async function seedCoupons() {
  const expiresAt = jalaliToDate(1406, 1, 1);

  const percent = {
    code: "WELCOME10",
    title: "۱۰٪ تخفیف اولین خرید",
    type: "PERCENT" as const,
    value: 10,
    maxDiscountAmount: 100_000,
    minOrderAmount: 300_000,
    scope: "ALL" as const,
    usageLimitTotal: 500,
    usageLimitPerUser: 1,
    firstOrderOnly: true,
    expiresAt,
  };
  await prisma.coupon.upsert({
    where: { code: percent.code },
    create: percent,
    update: percent,
  });
}

async function seedStoreSettings() {
  // کارت و روش‌های ارسال فقط اگر نبودند ساخته می‌شوند؛ ویرایش‌های ادمین حفظ می‌شود
  await prisma.companyBankCard.upsert({
    where: { id: bankCard.id },
    create: bankCard,
    update: {},
  });

  for (const method of shippingMethods) {
    await prisma.shippingMethod.upsert({
      where: { id: method.id },
      create: method,
      update: {},
    });
  }

  const settings: Record<string, Prisma.InputJsonValue> = {
    maxQuantityPerItem: 99,
    "sms.templates": smsTemplates,
    [ORDER_NUMBER_PREFIX_KEY]: DEFAULT_ORDER_NUMBER_PREFIX,
    ...(SEO_SETTING_DEFAULTS as Record<string, Prisma.InputJsonValue>),
    ...(BUSINESS_SETTING_DEFAULTS as Record<string, Prisma.InputJsonValue>),
    ...(HOME_SETTING_DEFAULTS as Record<string, Prisma.InputJsonValue>),
  };
  // فقط اگر وجود ندارد؛ اجرای دوباره‌ی seed تنظیمات ادمین را بازنویسی نمی‌کند
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}

/** صفحات اعتماد: فقط اگر نبودند، به‌صورت پیش‌نویس منتشرنشده */
async function seedStaticPages() {
  for (const page of seedPages) {
    const exists = await prisma.page.findUnique({
      where: { slug: page.slug },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.page.create({ data: { ...page, isPublished: false } });
  }
}

async function main() {
  const adminPhone = await seedAdmin();
  await seedCatalog();
  await seedCoupons();
  await seedStoreSettings();
  await seedStaticPages();

  const [productCount, variantCount] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);
  console.log(
    `seed انجام شد — ادمین: ${adminPhone} · ${productCount} محصول · ${variantCount} متغیر`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
