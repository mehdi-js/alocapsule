import { expect, test } from "@playwright/test";

import { db, signUpWithOtpSkippingPassword } from "./support";

/**
 * تعیین رمز عبور بعد از ثبت‌نام با پیامک اختیاری است: بعد از ورود موفق از کاربر
 * پرسیده می‌شود و «بعداً» او را بدون رمز، واردشده، به مقصد می‌برد.
 */

const PHONE = `0999444${String(Date.now()).slice(-4)}`;

test.afterAll(async () => {
  const prisma = db();
  const user = await prisma.user.findUnique({ where: { phone: PHONE } });
  if (!user) return;
  await prisma.auditLog.deleteMany({ where: { actorUserId: user.id } });
  await prisma.notificationLog.deleteMany({ where: { userId: user.id } });
  await prisma.cart.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test("ثبت‌نام با پیامک ⇒ پیشنهاد رمز ⇒ «بعداً» ⇒ کاربر واردشده و بدون رمز", async ({
  page,
}) => {
  await db().rateLimitEvent.deleteMany({});
  await page.goto("/login");
  // متن صفحه‌ی ورود دیگر رمز را اجباری نمی‌داند
  await expect(page.getByText("گذاشتن رمز عبور اختیاری است")).toBeVisible();

  await signUpWithOtpSkippingPassword(page, PHONE, "/account/orders");
  await expect(page).toHaveURL(/\/account\/orders$/);

  // بدون رمز، واردشده است: صفحه‌ی حساب باز می‌شود (نه ریدایرکت به ورود/تعیین رمز)
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(
    page.getByRole("link", { name: "تعیین رمز عبور" }),
  ).toBeVisible();

  const user = await db().user.findUniqueOrThrow({ where: { phone: PHONE } });
  expect(user.passwordHash).toBeNull();

  // صفحه‌ی ورود برای کاربر واردشده بدون رمز، به تعیین رمز اجبار نمی‌کند
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("وارد شده‌اید")).toBeVisible();
});

test("همان کاربر می‌تواند همان لحظه رمز هم بگذارد (مسیر قبلی سر جایش است)", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const phone = `0999443${String(Date.now()).slice(-4)}`;
  await db().rateLimitEvent.deleteMany({});
  try {
    const { signUpWithOtp } = await import("./support");
    await signUpWithOtp(page, phone, `Mo${Date.now()}x`, "/");
    const user = await db().user.findUniqueOrThrow({ where: { phone } });
    expect(user.passwordHash).not.toBeNull();
  } finally {
    const user = await db().user.findUnique({ where: { phone } });
    if (user) {
      await db().auditLog.deleteMany({ where: { actorUserId: user.id } });
      await db().cart.deleteMany({ where: { userId: user.id } });
      await db().user.delete({ where: { id: user.id } });
    }
    await context.close();
  }
});
