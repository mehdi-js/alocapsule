import { expect, test } from "@playwright/test";

/**
 * بلوک متن سئوی صفحه‌ی اصلی: پیش‌فرض فقط ابتدایش دیده می‌شود و با دکمه‌ی فلش باز
 * می‌شود (دسکتاپ و موبایل)؛ کل متن همیشه در HTML اولیه هست.
 */

for (const [name, viewport] of [
  ["دسکتاپ", { width: 1280, height: 900 }],
  ["موبایل", { width: 390, height: 800 }],
] as const) {
  test(`متن سئوی صفحه‌ی اصلی: بسته ⇒ باز ⇒ بسته (${name})`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto("/");

    const text = page.locator("[data-collapsible-text]");
    const toggle = page.locator("[data-collapsible-toggle]");
    await expect(text).toHaveAttribute("data-state", "collapsed");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toContainText("ادامه‌ی متن");

    // فقط سرتیتر اول و چند خط دیده می‌شود (ارتفاع بسته، نه ده‌ها خط)
    const collapsed = (await text.boundingBox())!.height;
    expect(collapsed).toBeLessThan(200);
    // ولی کل متن در DOM است
    await expect(text).toContainText("چرا الو کپسول؟");
    await expect(text.locator("h2")).toHaveCount(5);

    await toggle.click();
    await expect(text).toHaveAttribute("data-state", "open");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toContainText("بستن");
    expect((await text.boundingBox())!.height).toBeGreaterThan(collapsed * 2);

    await toggle.click();
    await expect(text).toHaveAttribute("data-state", "collapsed");
    await context.close();
  });
}

test("بدون JavaScript: متن کامل نمایش داده می‌شود و دکمه‌ای نیست", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const text = page.locator("[data-collapsible-text]");
  const height = (await text.boundingBox())!.height;
  expect(height).toBeGreaterThan(400);
  await expect(page.locator("[data-collapsible-toggle]")).toBeHidden();
  await context.close();
});

test("بخش شعب حذف شده: /branches و پنل شعب ۴۰۴", async ({ request }) => {
  expect((await request.get("/branches")).status()).toBe(404);
  expect((await request.get("/branches/any")).status()).toBe(404);
  const home = await (await request.get("/contact")).text();
  expect(home).not.toContain("آدرس شعب");
});
