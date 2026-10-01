import { expect, test } from "@playwright/test";

/**
 * P4 (SEO.md §۹): ریدایرکت‌های سایت قبلی روی سرور واقعی (معادل `curl -I`)،
 * سپس دنبال کردن ریدایرکت تا صفحه‌ی مقصد با گزینه‌ی انتخاب‌شده.
 */

const SERVER_TARGET = "/products/gas-capsule-refill-11kg?valve=butane";

async function head(
  request: import("@playwright/test").APIRequestContext,
  path: string,
) {
  const response = await request.get(path, { maxRedirects: 0 });
  return {
    status: response.status(),
    location: response.headers()["location"] ?? "",
  };
}

const pathOf = (location: string) => {
  const url = new URL(location, "http://localhost");
  return url.pathname + url.search;
};

test.describe("ریدایرکت‌های سایت قبلی", () => {
  test("آدرس درصد-کدشده‌ی فارسی‌رقم ⇒ 301 به شارژ ۱۱ بوتان", async ({
    request,
  }) => {
    const encoded = encodeURI("/product/شارژ-کپسول-گاز-۱۱-کیلویی-بوتان/");
    expect(encoded).toContain("%");
    const result = await head(request, encoded);
    expect(result.status).toBe(301);
    expect(pathOf(result.location)).toBe(SERVER_TARGET);
  });

  test("همان آدرس با ارقام لاتین ⇒ همان مقصد", async ({ request }) => {
    for (const path of [
      encodeURI("/product/شارژ-کپسول-گاز-11-کیلویی-بوتان/"),
      encodeURI("/product/شارژ-کپسول-گاز-11-کیلویی-بوتان"),
    ]) {
      const result = await head(request, path);
      expect(result.status).toBe(301);
      expect(pathOf(result.location)).toBe(SERVER_TARGET);
    }
  });

  test("دنبال کردن ریدایرکت ⇒ صفحه با «بوتان» انتخاب‌شده (بدون JS)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(encodeURI("/product/شارژ-کپسول-گاز-۱۱-کیلویی-بوتان/"));
    expect(pathOf(page.url())).toBe(SERVER_TARGET);
    await expect(page.locator("h1")).toHaveText("شارژ کپسول گاز ۱۱ کیلویی");
    await expect(
      page.getByRole("button", { name: "بوتان", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.goto(encodeURI("/product/شارژ-کپسول-گاز-۲۵-کیلویی-پرسی/"));
    expect(pathOf(page.url())).toBe(
      "/products/gas-capsule-refill-25kg?valve=persi",
    );
    await expect(
      page.getByRole("button", { name: "پرسی", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await context.close();
  });

  test("دسته‌ی قدیمی ⇒ hub شارژ؛ /?s=test ⇒ /؛ صفحه‌های اصلی", async ({
    request,
  }) => {
    const expected: [string, string][] = [
      [
        encodeURI("/product-category/شارژ-کپسول-گاز/"),
        "/category/gas-capsule-refill",
      ],
      [
        encodeURI("/product-category/خرید-کپسول-گاز/"),
        "/category/buy-gas-capsule",
      ],
      ["/?s=test", "/"],
      ["/shop/", "/products"],
      ["/about-us/", "/about"],
      ["/dashboard/", "/account"],
      ["/auth", "/login"],
      ["/blog/", "/"],
      [
        encodeURI("/product/خرید-کپسول-گاز-11-کیلویی/"),
        "/products/buy-gas-capsule-11kg",
      ],
      [encodeURI("/product/خرید-پیک-نیک/"), "/products/picnic-gas"],
      [
        encodeURI("/product/شارژ-کپسول-اکسیژن-۴۰-کیلویی/"),
        "/products/oxygen-capsule-refill",
      ],
    ];
    for (const [from, to] of expected) {
      const result = await head(request, from);
      expect(result.status, from).toBe(301);
      expect(pathOf(result.location), from).toBe(to);
    }
  });

  test("آدرس ناشناخته‌ی قدیمی بدون ردیف ⇒ نه خطا؛ مسیرهای خود سایت دست‌نخورده", async ({
    request,
  }) => {
    expect(
      (await request.get("/products/gas-capsule-refill-11kg")).status(),
    ).toBe(200);
    expect((await request.get("/cart", { maxRedirects: 0 })).status()).toBe(
      200,
    );
  });
});
