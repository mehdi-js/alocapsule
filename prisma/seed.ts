import { type Prisma, PrismaClient } from "@prisma/client";

import { BUSINESS_SETTING_DEFAULTS } from "@/lib/business-settings";
import { jalaliToDate } from "@/lib/date";
import { HOME_SETTING_DEFAULTS } from "@/lib/home-settings";
import {
  DEFAULT_ORDER_NUMBER_PREFIX,
  ORDER_NUMBER_PREFIX_KEY,
} from "@/lib/order-number";
import { normalizePhone } from "@/lib/phone";
import { buildOptionKey, buildVariantTitle } from "@/lib/product-options";
import { DEFAULT_RELATED_RULES, RELATED_RULES_KEY } from "@/lib/related-rules";
import {
  normalizeRedirectPath,
  normalizeRedirectTarget,
} from "@/lib/seo/redirects";
import { SEO_KEYS, SEO_SETTING_DEFAULTS } from "@/lib/seo/settings";

import {
  catalogCategories,
  catalogProducts,
  SEED_PRICE_UPDATED_JALALI,
} from "./seed-catalog";
import {
  bankCard,
  LEGACY_SHIPPING_IDS,
  shippingMethods,
  smsTemplates,
} from "./seed-data";
import { seedPages } from "./seed-pages";
import { SEED_REDIRECTS } from "./seed-redirects";

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

/** نسخه‌ی محتوای seed؛ مهاجرت یک‌باره‌ی داده‌ی نمونه‌ی قبلی فقط وقتی اجرا می‌شود که این کلید نباشد */
const SEED_VERSION_KEY = "seed.version";
const SEED_VERSION = "seo-p3";

/** داده‌ی نمونه‌ی فاز FORK که جایگزین شد (نامک‌های قبلی) */
const LEGACY_PRODUCT_SLUGS = [
  "charge-butane",
  "buy-cylinder-11kg",
  "picnic-set",
  "charge-oxygen-40kg",
];
const LEGACY_CATEGORY_SLUGS = [
  "lpg-charge",
  "lpg-buy",
  "picnic",
  "other-gases",
];

/** مقدارهای پیش‌فرض قبلی که اگر ادمین دست نزده باشد، با مقدار جدید عوض می‌شوند */
const LEGACY_SETTING_VALUES: Record<string, unknown[]> = {
  [SEO_KEYS.homeTitle]: ["شارژ و ارسال کپسول گاز در تهران | الو کپسول"],
  [SEO_KEYS.homeH1]: ["شارژ و ارسال کپسول گاز در تهران با الو کپسول"],
  [SEO_KEYS.homeDescription]: [
    "الو کپسول؛ شارژ، خرید و ارسال کپسول گاز مایع (LPG) در تهران. سفارش آنلاین، ارسال با پیک یا تحویل حضوری.",
  ],
  [SEO_KEYS.defaultDescription]: [
    "الو کپسول؛ شارژ، خرید و ارسال کپسول گاز مایع (LPG) در تهران. سفارش آنلاین، ارسال با پیک یا تحویل حضوری.",
  ],
  "home.hero.primaryHref": ["/category/lpg-charge"],
};

/**
 * مهاجرت یک‌باره‌ی ۴ محصول و ۴ دسته‌ی نمونه‌ی فاز FORK به کاتالوگ واقعی.
 * محصولِ دارای سفارش بایگانی می‌شود (حذف نمی‌شود)؛ بقیه حذف می‌شوند.
 */
async function removeLegacySamples() {
  const products = await prisma.product.findMany({
    where: { slug: { in: LEGACY_PRODUCT_SLUGS } },
    select: { id: true },
  });
  for (const { id } of products) {
    const orders = await prisma.orderItem.count({ where: { productId: id } });
    if (orders > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false, archivedAt: new Date() },
      });
    } else {
      await prisma.product.delete({ where: { id } });
    }
  }
  for (const slug of LEGACY_CATEGORY_SLUGS) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (category && category._count.products === 0) {
      await prisma.category.delete({ where: { id: category.id } });
    }
  }
  await prisma.shippingMethod.deleteMany({
    where: { id: { in: LEGACY_SHIPPING_IDS } },
  });
  // ترتیب روش‌های seed: عادی، فوری، حضوری (حضوری قبلاً دوم بود)
  for (const method of shippingMethods) {
    await prisma.shippingMethod.updateMany({
      where: { id: method.id },
      data: { sortOrder: method.sortOrder },
    });
  }
}

/**
 * مهاجرت یک‌باره‌ی seo-p3: کارت صفحه‌ی اصلی برای دسته‌های noindex (لینک مستقیم
 * محصول؛ SEO.md §۵.۲). seed فقط فیلدهای خالی را پر می‌کند و `isFeatured`
 * (بولی) خالی حساب نمی‌شود، پس این‌جا صریح به‌روز می‌شود.
 */
async function featureNoindexCategories() {
  await prisma.category.updateMany({
    where: {
      slug: {
        in: catalogCategories.filter((c) => c.isFeatured).map((c) => c.slug),
      },
    },
    data: { isFeatured: true },
  });
}

/**
 * کاتالوگ الو کپسول (`seed-catalog.ts`). محصولات فقط اگر نبودند ساخته می‌شوند؛
 * در محصول موجود فقط فیلدهای خالی پر می‌شوند. ادمین تصویر را اضافه می‌کند.
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

  const priceUpdatedAt = jalaliToDate(...SEED_PRICE_UPDATED_JALALI);
  const productIds = new Map<string, string>();
  for (const product of catalogProducts) {
    const { categorySlug, options, variants, pairedSlug, ...fields } = product;
    void pairedSlug;
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
      productIds.set(product.slug, existing.id);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        ...fields,
        categoryId,
        priceUpdatedAt: variants.some((v) => v.price > 0)
          ? priceUpdatedAt
          : null,
        options: {
          create: options.map((option, optionIndex) => ({
            name: option.name,
            code: option.code,
            sortOrder: optionIndex,
            values: {
              create: option.values.map((value, valueIndex) => ({
                label: value.label,
                code: value.code,
                sortOrder: valueIndex,
              })),
            },
          })),
        },
      },
      include: { options: { include: { values: true } } },
    });
    productIds.set(product.slug, created.id);

    const defs = options.map((option) => ({
      code: option.code,
      name: option.name,
      values: option.values.map((value) => ({ ...value, isActive: true })),
    }));
    const valueId = (optionCode: string, valueCode: string) =>
      created.options
        .find((option) => option.code === optionCode)
        ?.values.find((value) => value.code === valueCode)?.id;
    // محصول بدون گزینه یک ترکیب `default` می‌گیرد؛ محصول گزینه‌دار هر ترکیب را
    for (const [index, variant] of variants.entries()) {
      const links = Object.entries(variant.selection).map(
        ([optionCode, valueCode]) => {
          const id = valueId(optionCode, valueCode);
          if (!id)
            throw new Error(`مقدار ${optionCode}:${valueCode} در seed نیست`);
          return { optionValueId: id };
        },
      );
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          optionKey: buildOptionKey(variant.selection),
          title: buildVariantTitle(defs, variant.selection) || null,
          price: variant.price,
          shippingWeightGrams: variant.shippingWeightGrams,
          isActive: variant.isActive,
          sortOrder: index,
          optionValues: { create: links },
        },
      });
    }
  }

  // محصول متناظر (دوطرفه)؛ فقط اگر هنوز جفت ندارند
  for (const product of catalogProducts) {
    if (!product.pairedSlug) continue;
    const id = productIds.get(product.slug);
    const pairedId = productIds.get(product.pairedSlug);
    if (!id || !pairedId) continue;
    const [self, other] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        select: { pairedProductId: true },
      }),
      prisma.product.findUnique({
        where: { id: pairedId },
        select: { pairedProductId: true },
      }),
    ]);
    if (self?.pairedProductId || other?.pairedProductId) continue;
    await prisma.product.update({
      where: { id },
      data: { pairedProductId: pairedId },
    });
    await prisma.product.update({
      where: { id: pairedId },
      data: { pairedProductId: id },
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
    const existing = await prisma.shippingMethod.findUnique({
      where: { id: method.id },
    });
    if (!existing) {
      await prisma.shippingMethod.create({ data: method });
      continue;
    }
    // ردیف قبلی (مثل تحویل حضوری): فقط فیلدهای تازه‌ی خالی پر می‌شوند
    const { isActive, cost, ...rest } = method;
    void isActive;
    void cost;
    await prisma.shippingMethod.update({
      where: { id: existing.id },
      data: missingFields(existing, rest),
    });
  }

  const settings: Record<string, Prisma.InputJsonValue> = {
    maxQuantityPerItem: 99,
    "sms.templates": smsTemplates,
    [ORDER_NUMBER_PREFIX_KEY]: DEFAULT_ORDER_NUMBER_PREFIX,
    ...(SEO_SETTING_DEFAULTS as Record<string, Prisma.InputJsonValue>),
    ...(BUSINESS_SETTING_DEFAULTS as Record<string, Prisma.InputJsonValue>),
    ...(HOME_SETTING_DEFAULTS as Record<string, Prisma.InputJsonValue>),
    [RELATED_RULES_KEY]: DEFAULT_RELATED_RULES,
  };
  // اجرای دوباره‌ی seed تنظیمات ادمین را بازنویسی نمی‌کند: فقط کلید نبود، مقدار
  // خالی، یا (در مهاجرت یک‌باره) مقدار پیش‌فرض قدیمیِ دست‌نخورده عوض می‌شود
  const isEmptyValue = (value: unknown) =>
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  for (const [key, value] of Object.entries(settings)) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.setting.create({ data: { key, value } });
      continue;
    }
    const legacy = LEGACY_SETTING_VALUES[key]?.some(
      (old) => JSON.stringify(old) === JSON.stringify(existing.value),
    );
    if ((isEmptyValue(existing.value) && !isEmptyValue(value)) || legacy) {
      await prisma.setting.update({ where: { key }, data: { value } });
    }
  }
}

/**
 * صفحات اعتماد: فقط اگر نبودند، به‌صورت پیش‌نویس منتشرنشده. در مهاجرت
 * یک‌باره‌ی نسخه، پیش‌نویس‌های **منتشرنشده** با متن جدید جایگزین می‌شوند
 * (صفحه‌ی منتشرشده دست نمی‌خورد).
 */
async function seedStaticPages(refreshDrafts: boolean) {
  for (const page of seedPages) {
    const exists = await prisma.page.findUnique({
      where: { slug: page.slug },
      select: { id: true, isPublished: true },
    });
    if (!exists) {
      await prisma.page.create({ data: { ...page, isPublished: false } });
    } else if (refreshDrafts && !exists.isPublished) {
      await prisma.page.update({ where: { id: exists.id }, data: page });
    }
  }
}

/**
 * ریدایرکت‌های احتیاطی سایت قدیمی (`seed-redirects.ts`، SEO.md §۹.۱). فقط اگر برای
 * آن مبدأ ردیفی نیست ساخته می‌شود؛ ویرایش یا حذف ادمین بازنویسی نمی‌شود. ردیفی
 * که مبدأ و مقصدش بعد از نرمال‌سازی یکی است (حلقه) ساخته نمی‌شود.
 */
async function seedRedirects() {
  for (const { from, to } of SEED_REDIRECTS) {
    const fromPath = normalizeRedirectPath(from);
    const toPath = normalizeRedirectTarget(to);
    if (!toPath || normalizeRedirectPath(toPath) === fromPath) continue;
    await prisma.redirect.upsert({
      where: { fromPath },
      create: {
        fromPath,
        toPath,
        statusCode: 301,
        note: "سایت قبلی (SEO.md §۹.۱)",
      },
      update: {},
    });
  }
}

async function main() {
  const adminPhone = await seedAdmin();
  const version = await prisma.setting.findUnique({
    where: { key: SEED_VERSION_KEY },
  });
  const migrate = version?.value !== SEED_VERSION;
  if (migrate) await removeLegacySamples();
  await seedCatalog();
  if (migrate) await featureNoindexCategories();
  await seedCoupons();
  await seedStoreSettings();
  await seedStaticPages(migrate);
  await seedRedirects();
  if (migrate) {
    await prisma.setting.upsert({
      where: { key: SEED_VERSION_KEY },
      create: { key: SEED_VERSION_KEY, value: SEED_VERSION },
      update: { value: SEED_VERSION },
    });
  }

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
