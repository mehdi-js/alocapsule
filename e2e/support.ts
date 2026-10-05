import { existsSync, readFileSync } from "node:fs";

import { type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { SMS_OUTBOX } from "../playwright.config";

/** داده‌ی مشترک تست‌ها (یکتای هر اجرا) */
export const RUN_ID = process.env.E2E_RUN_ID ?? "local";
export const CUSTOMER_PHONE = `0999555${RUN_ID.slice(-4).padStart(4, "0")}`;
export const ADMIN_PHONE = process.env.E2E_ADMIN_PHONE ?? "09000000000";
export const COUPON_CODE = `E2E${RUN_ID.slice(-6).toUpperCase()}`;
/** محصول و دسته‌ی تست (کاتالوگ واقعی محصول فعال ندارد) — قیمت ۱۱۰٬۰۰۰ تومان */
/** روش ارسال فعال تست (روش‌های seed عادی/فوری تا هزینه‌گذاری کارفرما غیرفعال‌اند) */
export const E2E_SHIPPING_NAME = `ارسال e2e ${RUN_ID}`;
export const E2E_PRODUCT_SLUG = `e2e-product-${RUN_ID}`;
export const E2E_CATEGORY_SLUG = `e2e-category-${RUN_ID}`;
export const E2E_PRODUCT_PRICE = 110_000;
/** رمز مشتری تست (در ثبت‌نام تعیین می‌شود) و رمز موقت ادمین در طول تست */
export const CUSTOMER_PASSWORD = `Mo${RUN_ID}x`;
export const ADMIN_PASSWORD = "E2eAdmin1405";

let prisma: PrismaClient | undefined;
export function db(): PrismaClient {
  if (!process.env.DATABASE_URL && existsSync(".env"))
    process.loadEnvFile(".env");
  prisma ??= new PrismaClient();
  return prisma;
}

/** آخرین کد OTP فرستاده‌شده به `phone` (از outbox پیامک console) */
export async function readOtp(phone: string, after: Date): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (existsSync(SMS_OUTBOX)) {
      const lines = readFileSync(SMS_OUTBOX, "utf8").trim().split("\n");
      for (const line of lines.reverse()) {
        const sms = JSON.parse(line) as {
          to: string;
          args: string[];
          at: string;
        };
        if (
          sms.to === phone &&
          new Date(sms.at) >= after &&
          /^\d{6}$/.test(sms.args[0] ?? "")
        ) {
          return sms.args[0]!;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`OTP برای ${phone} پیدا نشد`);
}

/**
 * ثبت‌نام با کد پیامکی (کاربر جدید/بدون رمز) و تعیین رمز (اختیاری؛ این تابع تعیین می‌کند)؛ سپس به
 * `next` می‌رود.
 */
export async function signUpWithOtp(
  page: Page,
  phone: string,
  password: string,
  next = "/",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  const sentAt = new Date(Date.now() - 1000);
  await page.getByLabel("شماره‌ی موبایل").fill(phone);
  await page.getByRole("button", { name: "ادامه" }).click();
  const code = await readOtp(phone, sentAt);
  await page.getByLabel("کد تأیید").fill(code);
  await page.getByRole("button", { name: "ورود" }).click();

  await page.waitForURL("**/set-password**");
  await page.getByLabel("رمز عبور جدید", { exact: true }).fill(password);
  await page.getByLabel("تکرار رمز عبور جدید").fill(password);
  await page.getByRole("button", { name: "تنظیم رمز و ادامه" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/set-password"));
}

/** ورود کاربر رمزدار با رمز عبور */
export async function loginWithPassword(
  page: Page,
  phone: string,
  password: string,
  next = "/",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("شماره‌ی موبایل").fill(phone);
  await page.getByRole("button", { name: "ادامه" }).click();
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** ثبت‌نام با کد پیامکی بدون تعیین رمز («بعداً تنظیم می‌کنم») */
export async function signUpWithOtpSkippingPassword(
  page: Page,
  phone: string,
  next = "/",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  const sentAt = new Date(Date.now() - 1000);
  await page.getByLabel("شماره‌ی موبایل").fill(phone);
  await page.getByRole("button", { name: "ادامه" }).click();
  const code = await readOtp(phone, sentAt);
  await page.getByLabel("کد تأیید").fill(code);
  await page.getByRole("button", { name: "ورود" }).click();

  // بعد از ورود موفق پیشنهاد تعیین رمز می‌آید؛ «بعداً» ⇒ مقصد
  await page.waitForURL("**/set-password**");
  await page.getByRole("link", { name: "بعداً تنظیم می‌کنم" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/set-password"));
}
