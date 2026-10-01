import { expect, test } from "@playwright/test";

/**
 * P5: قواعد سئوی به‌ارث‌رسیده از علی حان (SEO.md §۳، پاراگراف اول) روی خروجی
 * اولیه‌ی HTML (بدون JS) — محتوای آکاردئون‌ها، یک HTML برای موبایل و دسکتاپ،
 * یک H1، نبود امتیاز، تصویر OG ثابت و کنترل ALLOW_INDEXING.
 */

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

const PAGES = [
  "/",
  "/products",
  "/category/gas-capsule-refill",
  "/category/buy-gas-capsule",
  "/products/gas-capsule-refill-11kg",
  "/products/buy-gas-capsule-50kg",
  "/products/oxygen-capsule-refill",
  "/about",
  "/contact",
];

/** HTML بدون محتوای <script>؛ شناسه‌های تصادفی React/RSC مقایسه را خراب نکنند */
const strip = (html: string) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\s(id|for|aria-[a-z]+)="[^"]*"/g, "")
    // زمان‌مهر cache-busting سرور توسعه (`?v=…`) در هر درخواست فرق می‌کند
    .replace(/\?v=\d+/g, "");

test.describe("قواعد به‌ارث‌رسیده", () => {
  test("یک HTML برای موبایل و دسکتاپ (همان پاسخ سرور)", async ({ request }) => {
    for (const path of PAGES) {
      const get = async (userAgent: string) =>
        (
          await request.get(path, { headers: { "User-Agent": userAgent } })
        ).text();
      const desktop = await get(DESKTOP_UA);
      const mobile = await get(MOBILE_UA);
      expect(strip(mobile), path).toBe(strip(desktop));
    }
  });

  test("دقیقاً یک H1 و بدون امتیاز/نظر در JSON-LD", async ({ request }) => {
    for (const path of PAGES) {
      const html = await (await request.get(path)).text();
      expect((html.match(/<h1[\s>]/g) ?? []).length, path).toBe(1);
      for (const json of html.matchAll(
        /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g,
      )) {
        expect(json[1], path).not.toMatch(/"(aggregateRating|review)"/);
      }
    }
  });

  test("محتوای آکاردئون‌های محصول (توضیحات، ارسال و نگهداری) و FAQ در HTML اولیه", async ({
    request,
  }) => {
    const html = await (
      await request.get("/products/gas-capsule-refill-11kg")
    ).text();
    const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
    // آکاردئون توضیحات: متن خود محصول (بخش مخصوص ۱۱ کیلویی)
    expect(visible).toContain("قبل از سفارش چه چیزی را بررسی کنم؟");
    // آکاردئون «ارسال و نگهداری»: زمان تحویل از تنظیمات جایگزین شده
    expect(visible).toContain("ارسال عادی ۱ روزه");
    expect(visible).toContain("ارسال فوری در ساعات کاری ۱ تا ۴ ساعت");
    expect(visible).not.toContain("[[");
    // سوال متداول مخصوص اندازه
    expect(visible).toContain("کپسول ۱۱ کیلویی برای چه مدت کافی است؟");
  });

  test("بلوک سئوی صفحه‌ی اصلی و H2 «چطور انجام می‌شود» در HTML اولیه", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
    expect(visible).toContain("شارژ کپسول گاز با تعویض سریع");
    expect(visible).toContain("ارسال عادی</strong> (تحویل ۱ روزه)");
    expect(visible).toMatch(/<h2[^>]*>[^<]*چطور انجام می‌شود/);
  });

  test("تصویر OG ثابت: بدون تولید پویای تصویر با متن فارسی", async ({
    request,
  }) => {
    for (const path of PAGES) {
      const html = await (await request.get(path)).text();
      expect(html, path).not.toMatch(/opengraph-image|twitter-image/);
    }
  });

  test("ALLOW_INDEXING=false: robots کامل بسته و همه‌ی صفحات noindex,nofollow", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow:\s*\/\s*$/m);
    for (const path of ["/", "/products/gas-capsule-refill-11kg"]) {
      const html = await (await request.get(path)).text();
      expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    }
  });
});
