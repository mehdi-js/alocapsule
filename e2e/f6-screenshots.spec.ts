import { mkdirSync } from "node:fs";
import path from "node:path";

import { test } from "@playwright/test";

import { db, RUN_ID, signUpWithOtp } from "./support";

/**
 * تولید اسکرین‌شات‌های گزارش فاز F6 (دسکتاپ و موبایل) در `docs/screenshots/`.
 * فقط با `F6_SHOTS=1 npx playwright test e2e/f6-screenshots.spec.ts` اجرا می‌شود.
 */
test.skip(!process.env.F6_SHOTS, "فقط برای تولید اسکرین‌شات");

const OUT = path.join(process.cwd(), "docs", "screenshots");
const PHONE = `0999888${RUN_ID.slice(-4).padStart(4, "0")}`;
const SIZES = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

async function cleanupUser() {
  const prisma = db();
  const user = await prisma.user.findUnique({ where: { phone: PHONE } });
  if (!user) return;
  await prisma.auditLog.deleteMany({ where: { actorUserId: user.id } });
  await prisma.notificationLog.deleteMany({ where: { userId: user.id } });
  await prisma.cart.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

test.afterAll(cleanupUser);

test("اسکرین‌شات‌های F6", async ({ browser }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  for (const [name, viewport] of Object.entries(SIZES)) {
    const context = await browser.newContext({
      viewport,
      locale: "fa-IR",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const shot = async (file: string) =>
      page.screenshot({
        path: path.join(OUT, `${name}-${file}.png`),
        fullPage: true,
        animations: "disabled",
      });

    for (const [file, url] of [
      ["home", "/"],
      ["product-service", "/products/charge-butane"],
      ["product-inquiry", "/products/charge-oxygen-40kg"],
    ] as const) {
      await page.goto(url, { waitUntil: "networkidle" });
      await shot(file);
    }

    // محدودیت ارسال OTP (۳ بار در ۱۰ دقیقه) بین دو اندازه پاک می‌شود
    await db().rateLimitEvent.deleteMany({});
    await signUpWithOtp(page, PHONE, `Mo${RUN_ID}z`, "/");
    await page.goto("/products/charge-butane");
    await page
      .getByRole("button", { name: /افزودن به سبد/ })
      .first()
      .click();
    await page.getByText("به سبد خرید اضافه شد").waitFor();
    await page.goto("/cart", { waitUntil: "networkidle" });
    await shot("cart");
    await page.goto("/checkout", { waitUntil: "networkidle" });
    await shot("checkout");
    await context.close();
    // کاربر برای اندازه‌ی بعدی دوباره وارد می‌شود
    await cleanupUser();
  }
});
