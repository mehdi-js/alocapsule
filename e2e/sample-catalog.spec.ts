import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { SMS_OUTBOX } from "../playwright.config";
import { db, RUN_ID, signUpWithOtp } from "./support";

/**
 * چرخه‌ی خرید با محصول نمونه‌ی seed («شارژ کپسول گاز بوتان») روی پیامک
 * console، و اطمینان از این‌که هیچ اثری از برند/محتوای پروژه‌ی مبدأ در صفحات و
 * پیامک‌ها نیست. (تسویه با کارت‌به‌کارت؛ پرداخت آنلاین وجود ندارد.)
 */

const PHONE = `0999777${RUN_ID.slice(-4).padStart(4, "0")}`;
const PASSWORD = `Mo${RUN_ID}y`;

/**
 * عبارت‌های برند و محتوای پروژه‌ی مبدأ که نباید در خروجی سایت دیده شوند.
 * نگهبان جستجوی نهایی است، پس عبارت‌ها تکه‌تکه نوشته شده‌اند تا خود این فایل
 * در جستجوی کل پروژه پیدا نشود.
 */
const piece = (...parts: string[]) => parts.join("");
const FORBIDDEN = [
  new RegExp(piece("علی", "[\\u200c ]?", "حان")),
  new RegExp(piece("ali", "han"), "i"),
  new RegExp(piece("باق", "لوا")),
  new RegExp(piece("هاو", "یج")),
  new RegExp(piece("کاد", "ایف")),
  new RegExp(piece("شکلات", " ", "دبی")),
];

const PAGES = [
  "/",
  "/products",
  "/products/charge-butane",
  "/products/buy-cylinder-11kg",
  "/category/lpg-charge",
  "/about",
  "/contact",
];

test.describe.serial("محصول نمونه", () => {
  test.afterAll(async () => {
    const prisma = db();
    const user = await prisma.user.findUnique({ where: { phone: PHONE } });
    if (!user) return;
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const ids = orders.map((o) => o.id);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorUserId: user.id }, { entityId: { in: ids } }] },
    });
    await prisma.notificationLog.deleteMany({ where: { userId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("صفحات عمومی بدون اثر برند مبدأ", async ({ page }) => {
    for (const path of PAGES) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      const html = await page.content();
      for (const pattern of FORBIDDEN) {
        expect(html, `${path} ⇒ ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  test("خرید شارژ بوتان تا ثبت سفارش و پیامک بدون اثر برند مبدأ", async ({
    page,
  }) => {
    await signUpWithOtp(page, PHONE, PASSWORD, "/");
    await page.goto("/products/charge-butane");
    await page
      .getByRole("button", { name: "افزودن به سبد خرید" })
      .first()
      .click();
    await expect(page.getByText("به سبد خرید اضافه شد")).toBeVisible();

    await page.goto("/cart");
    await page.getByRole("link", { name: "ادامه و ثبت سفارش" }).click();
    await page.waitForURL("**/checkout");
    await page.getByLabel("نام گیرنده").fill("مشتری آزمایشی");
    await page.getByLabel("نشانی کامل").fill("تهران، خیابان آزمایش، پلاک ۱۰");
    await page.getByRole("button", { name: "ذخیره‌ی آدرس" }).click();
    await expect(page.getByRole("radio").first()).toBeChecked();
    await page
      .getByRole("complementary", { name: "خلاصه سفارش" })
      .getByRole("button", { name: "ثبت سفارش" })
      .click();

    await page.waitForURL("**/checkout/success/**");
    const orderNumber = decodeURIComponent(page.url().split("/").pop() ?? "");
    // پیشوند از Setting `order.numberPrefix` (seed: AC)
    expect(orderNumber).toMatch(/^AC-\d{8}-\d{4,}$/);

    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
      include: { items: true },
    });
    expect(order.items[0]).toMatchObject({ unitPrice: 800_000, quantity: 1 });

    const sms = readFileSync(SMS_OUTBOX, "utf8");
    expect(sms).toContain("الو کپسول");
    for (const pattern of FORBIDDEN) expect(sms).not.toMatch(pattern);
  });
});
