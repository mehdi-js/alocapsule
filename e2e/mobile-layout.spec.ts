import { expect, test } from "@playwright/test";

/**
 * موبایل: هیچ صفحه‌ای نباید افقی اسکرول شود یا از لبه‌ی چپ بزند. علت پیشین: دکمه‌ی
 * نوار چسبان صفحه‌ی محصول از عرض نوار بیرون می‌زد و کل صفحه را جابه‌جا می‌کرد.
 */

const PAGES = [
  "/",
  "/products",
  "/category/gas-capsule-refill",
  "/category/buy-gas-capsule",
  "/products/gas-capsule-refill-25kg",
  "/products/gas-capsule-refill-11kg?valve=butane",
  "/products/buy-gas-capsule-50kg?fill=filled",
  "/products/oxygen-capsule-refill",
  "/about",
  "/contact",
  "/cart",
];

for (const width of [320, 360, 390, 430]) {
  test(`بدون اسکرول افقی در عرض ${width}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const metrics = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        sticky: (() => {
          const bar = document.querySelector<HTMLElement>(
            "div.fixed.inset-x-0.bottom-0",
          );
          if (!bar) return null;
          const rect = bar.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        })(),
      }));
      expect(metrics.scroll, `${path} @${width}`).toBeLessThanOrEqual(
        metrics.client,
      );
      expect(metrics.body, `${path} @${width}`).toBeLessThanOrEqual(
        metrics.client,
      );
      if (metrics.sticky) {
        expect(
          metrics.sticky.left,
          `${path} نوار @${width}`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          metrics.sticky.right,
          `${path} نوار @${width}`,
        ).toBeLessThanOrEqual(metrics.client);
      }
    }
    await context.close();
  });
}

test("نوار چسبان محصول: دکمه‌ی افزودن دیده می‌شود و داخل نوار است", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/products/gas-capsule-refill-25kg");
  const bar = page.locator("div.fixed.inset-x-0.bottom-0");
  const button = bar.getByRole("button", { name: "افزودن به سبد خرید" });
  await expect(button).toBeVisible();
  const box = (await button.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await context.close();
});
