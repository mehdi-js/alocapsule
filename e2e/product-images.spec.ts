import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { db, E2E_CATEGORY_SLUG, E2E_PRODUCT_SLUG, RUN_ID } from "./support";

/**
 * تصویر محصول همه‌جا ۱:۱ است (کارت لیست، تصویر اصلی و بندانگشتی گالری) روی
 * دسکتاپ و موبایل، و تصویر مربعی بدون برش نمایش داده می‌شود.
 */

const DIR = path.join(process.cwd(), "public", "uploads", "products");
const BASE = `e2e-img-${RUN_ID}`;
const keys = [`${BASE}-1`, `${BASE}-2`];

/** مربع ۸۰۰: چهار ربع رنگی (برای تشخیص برش) و یک عریض ۱۶۰۰×۸۰۰ */
async function writeImages() {
  mkdirSync(DIR, { recursive: true });
  const quadrants = (width: number) =>
    sharp({
      create: {
        width,
        height: 800,
        channels: 3,
        background: { r: 220, g: 40, b: 40 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 40,
              height: 40,
              channels: 3,
              background: { r: 0, g: 0, b: 255 },
            },
          },
          top: 0,
          left: 0,
        },
        {
          input: {
            create: {
              width: 40,
              height: 40,
              channels: 3,
              background: { r: 0, g: 200, b: 0 },
            },
          },
          top: 760,
          left: width - 40,
        },
      ])
      .webp()
      .toBuffer();
  for (const [index, width] of [800, 1600].entries()) {
    const buffer = await quadrants(width);
    writeFileSync(path.join(DIR, `${keys[index]}.webp`), buffer);
    writeFileSync(path.join(DIR, `${keys[index]}-thumb.webp`), buffer);
  }
}

test.describe.serial("نسبت ۱:۱ تصویر محصول", () => {
  test.beforeAll(async () => {
    await writeImages();
    const product = await db().product.findUniqueOrThrow({
      where: { slug: E2E_PRODUCT_SLUG },
    });
    await db().productImage.createMany({
      data: keys.map((key, index) => ({
        productId: product.id,
        url: `/api/media/products/${key}.webp`,
        alt: `تصویر تست ${index + 1}`,
        sortOrder: index,
        isPrimary: index === 0,
        width: index === 0 ? 800 : 1600,
        height: 800,
      })),
    });
  });

  test.afterAll(async () => {
    const product = await db().product.findUnique({
      where: { slug: E2E_PRODUCT_SLUG },
    });
    if (product) {
      await db().productImage.deleteMany({ where: { productId: product.id } });
    }
    for (const key of keys) {
      rmSync(path.join(DIR, `${key}.webp`), { force: true });
      rmSync(path.join(DIR, `${key}-thumb.webp`), { force: true });
    }
  });

  for (const [name, viewport] of [
    ["دسکتاپ", { width: 1440, height: 900 }],
    ["لپ‌تاپ کوچک", { width: 1024, height: 768 }],
    ["تبلت", { width: 768, height: 1024 }],
    ["موبایل", { width: 390, height: 800 }],
    ["موبایل کوچک", { width: 320, height: 640 }],
  ] as const) {
    test(`گالری و کارت محصول مربع‌اند (${name})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      // کارت در لیست دسته
      await page.goto(`/category/${E2E_CATEGORY_SLUG}`);
      const cardImage = page
        .locator("article")
        .filter({ hasText: "محصول تست e2e" })
        .locator("a[href^='/products/'] img")
        .first();
      await expect(cardImage).toBeVisible();
      const cardBox = (await cardImage.boundingBox())!;
      expect(cardBox.width / cardBox.height).toBeCloseTo(1, 1);

      // صفحه‌ی محصول: تصویر اصلی و بندانگشتی‌ها
      await page.goto(`/products/${E2E_PRODUCT_SLUG}`);
      const main = page.locator("img[alt='تصویر تست 1']");
      await expect(main).toBeVisible();
      const mainBox = (await main.boundingBox())!;
      expect(mainBox.width / mainBox.height).toBeCloseTo(1, 1);
      // تصویر مربعی بدون برش: کل ۸۰۰×۸۰۰ در کادر است
      expect(await main.evaluate((el) => getComputedStyle(el).objectFit)).toBe(
        "cover",
      );
      const natural = await main.evaluate((el: HTMLImageElement) => [
        el.naturalWidth,
        el.naturalHeight,
      ]);
      expect(natural[0]).toBe(natural[1]);

      const thumbs = page.locator("ul[aria-label='تصاویر محصول'] li img");
      await expect(thumbs).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        const box = (await thumbs.nth(i).boundingBox())!;
        expect(box.width / box.height, `بندانگشتی ${i + 1}`).toBeCloseTo(1, 1);
      }
      // کادر اصلی از عرض ستون بیرون نمی‌زند
      expect(mainBox.width).toBeLessThanOrEqual(viewport.width);
      await context.close();
    });
  }

  test("تصویر مربعی در کادر مربع برش نمی‌خورد: گوشه‌های رنگی دیده می‌شوند", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`/products/${E2E_PRODUCT_SLUG}`);
    const main = page.locator("img[alt='تصویر تست 1']");
    await expect(main).toBeVisible();
    const box = (await main.boundingBox())!;
    const shot = await page.screenshot({
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    const { data, info } = await sharp(shot)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i]!, data[i + 1]!, data[i + 2]!];
    };
    const scale = info.width / 800;
    // گوشه‌ی بالا-چپِ تصویر آبی و گوشه‌ی پایین-راست سبز است (۴۰ پیکسل از ۸۰۰)
    const topLeft = at(Math.round(10 * scale), Math.round(10 * scale));
    const bottomRight = at(
      info.width - Math.round(10 * scale),
      info.height - Math.round(10 * scale),
    );
    expect(topLeft[2]).toBeGreaterThan(200); // آبی
    expect(bottomRight[1]).toBeGreaterThan(150); // سبز
    await context.close();
  });
});
