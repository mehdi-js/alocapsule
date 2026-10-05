import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

import {
  ADMIN_BACKUP,
  E2E_TMP,
  SHIPPING_BACKUP,
  SMS_CONNECTION_BACKUP,
} from "../playwright.config";

/**
 * پیش از تست‌ها: شناسه‌ی اجرا، پوشه‌ی موقت (outbox پیامک و رسیدها)، کد
 * تخفیف تست، رمز موقت ادمین و پاک‌سازی شمارنده‌های rate limit (دیتابیس توسعه).
 */
export default async function globalSetup() {
  process.env.E2E_RUN_ID = randomBytes(4).readUInt32BE().toString();
  rmSync(E2E_TMP, { recursive: true, force: true });
  mkdirSync(E2E_TMP, { recursive: true });

  const {
    db,
    ADMIN_PASSWORD,
    ADMIN_PHONE,
    COUPON_CODE,
    E2E_CATEGORY_SLUG,
    E2E_PRODUCT_PRICE,
    E2E_PRODUCT_SLUG,
    E2E_SHIPPING_NAME,
  } = await import("./support");
  const prisma = db();
  // چند ورود OTP از یک IP در چند دقیقه ⇒ محدودیت ۳ ارسال در ۱۰ دقیقه
  await prisma.rateLimitEvent.deleteMany({});
  await prisma.coupon.create({
    data: {
      code: COUPON_CODE,
      title: "کد تست e2e",
      type: "PERCENT",
      value: 10,
    },
  });
  // ارسال عادی/فوری seed غیرفعال‌اند؛ تست‌های خرید یک روش فعال با آدرس لازم دارند.
  // آستانه‌ی رایگان ۱۰ عدد (پیام «با افزودن N عدد دیگر…» در سبد)
  await prisma.shippingMethod.create({
    data: {
      name: E2E_SHIPPING_NAME,
      cost: 100_000,
      freeAboveQuantity: 10,
      sortOrder: 0,
    },
  });
  await prisma.category.create({
    data: {
      name: "دسته‌ی تست e2e",
      slug: E2E_CATEGORY_SLUG,
      products: {
        create: {
          name: "محصول تست e2e",
          slug: E2E_PRODUCT_SLUG,
          unit: "GRAM",
          variants: {
            create: {
              unitValue: 500,
              price: E2E_PRODUCT_PRICE,
              shippingWeightGrams: 650,
            },
          },
        },
      },
    },
  });
  // تست‌ها روی خروجی seed روش‌های ارسال حساب می‌کنند (زمان تحویل، فوری/عادی)؛
  // ردیف‌ها موقتاً به مقدار seed برمی‌گردند و در teardown به حالت قبلی
  const { shippingMethods: seeded } = await import("../prisma/seed-data");
  if (!existsSync(SHIPPING_BACKUP)) {
    const rows = await prisma.shippingMethod.findMany({
      where: { id: { in: seeded.map((method) => method.id) } },
    });
    writeFileSync(SHIPPING_BACKUP, JSON.stringify(rows));
  }
  for (const { id, ...data } of seeded) {
    await prisma.shippingMethod.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  const admin = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE } });
  if (admin?.role !== "ADMIN" || !admin.isActive) {
    throw new Error(`ادمین فعال ${ADMIN_PHONE} لازم است (npm run db:seed)`);
  }
  // رمز ادمین در طول تست موقتاً عوض و در teardown برگردانده می‌شود
  const { hashPassword } = await import("../src/server/auth/password-hash");
  // اگر اجرای قبلی نیمه‌کاره ماند، نسخه‌ی اصلیِ ذخیره‌شده دست نمی‌خورد
  if (!existsSync(ADMIN_BACKUP)) {
    writeFileSync(
      ADMIN_BACKUP,
      JSON.stringify({ passwordHash: admin.passwordHash }),
    );
  }
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(ADMIN_PASSWORD) },
  });
  // 🔴 اتصال ملی پیامکِ ذخیره‌شده در پنل بر SMS_PROVIDER=console مقدم است؛
  // بدون کنار گذاشتنش تست‌ها پیامک واقعی می‌فرستند
  const connection = await prisma.setting.findUnique({
    where: { key: "sms.connection" },
  });
  if (!existsSync(SMS_CONNECTION_BACKUP)) {
    writeFileSync(
      SMS_CONNECTION_BACKUP,
      JSON.stringify({ value: connection?.value ?? null }),
    );
  }
  await prisma.setting.deleteMany({ where: { key: "sms.connection" } });
  await prisma.$disconnect();
}
