import { expect, type Page, test } from "@playwright/test";

/**
 * P3 (SEO.md §۵، §۶، §۸): خروجی HTML اولیه (بدون JS) — H1، عنوان absolute،
 * JSON-LD، sitemap و محصولات مرتبط روی داده‌ی seed.
 */

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const texts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  // هر اسکریپت یک شیء یا آرایه است
  return texts.flatMap((text) => {
    expect(text).not.toContain("{{");
    const parsed = JSON.parse(text) as unknown;
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<
      string,
      unknown
    >[];
  });
}

const typeOf = (item: Record<string, unknown>) => String(item["@type"]);

test.describe("سئوی صفحات (HTML اولیه، بدون JS)", () => {
  test.use({ javaScriptEnabled: false });

  test("صفحه‌ی اصلی: یک H1، عنوان absolute، Organization + LocalBusiness + WebSite + FAQPage", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(
      "شارژ کپسول گاز و خرید کپسول گاز در تهران",
    );
    await expect(page).toHaveTitle(
      "شارژ کپسول گاز و خرید کپسول گاز در تهران | الو کپسول",
    );
    const items = await jsonLd(page);
    expect(items.map(typeOf)).toEqual(
      expect.arrayContaining([
        "Organization",
        "LocalBusiness",
        "WebSite",
        "FAQPage",
      ]),
    );
    const business = items.find((i) => typeOf(i) === "LocalBusiness")!;
    expect(business.areaServed).toEqual({ "@type": "City", name: "تهران" });
    expect(business).not.toHaveProperty("openingHoursSpecification");
    // کارت‌های دسته: hubها و محصول اکسیژن (سایر گازها)
    for (const href of [
      "/category/gas-capsule-refill",
      "/category/buy-gas-capsule",
      "/products/oxygen-capsule-refill",
    ]) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
    // بلوک محتوای سئو: توکن‌ها جایگزین شده‌اند
    await expect(page.getByText("[[")).toHaveCount(0);
  });

  test("hub شارژ: H1 «قیمت شارژ کپسول گاز»، ItemList با ۴ محصول، BreadcrumbList و FAQPage", async ({
    page,
  }) => {
    await page.goto("/category/gas-capsule-refill");
    await expect(page.locator("h1")).toHaveText("قیمت شارژ کپسول گاز");
    const items = await jsonLd(page);
    const list = items.find((i) => typeOf(i) === "ItemList") as {
      itemListElement: unknown[];
    };
    expect(list.itemListElement).toHaveLength(4);
    expect(items.map(typeOf)).toEqual(
      expect.arrayContaining(["BreadcrumbList", "FAQPage"]),
    );
    await expect(
      page.locator("h2", { hasText: "جدول قیمت شارژ کپسول گاز" }),
    ).toBeVisible();
  });

  test("Product: شارژ ۵۰ Offer؛ خرید ۵۰ AggregateOffer؛ استعلامی بدون offers", async ({
    page,
  }) => {
    const offersOf = async (slug: string) => {
      await page.goto(`/products/${slug}`);
      const product = (await jsonLd(page)).find(
        (i) => typeOf(i) === "Product",
      )!;
      expect(product).not.toHaveProperty("aggregateRating");
      return product.offers as Record<string, unknown> | undefined;
    };
    expect(await offersOf("gas-capsule-refill-50kg")).toMatchObject({
      "@type": "Offer",
      price: "38500000",
      priceCurrency: "IRR",
    });
    expect(await offersOf("buy-gas-capsule-50kg")).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "150000000",
      highPrice: "188500000",
    });
    expect(await offersOf("oxygen-capsule-refill")).toBeUndefined();
    // پیک‌نیک غیرفعال و بی‌قیمت: صفحه‌ی ۲۰۰ بدون offers
    expect(await offersOf("picnic-gas")).toBeUndefined();
  });

  test("breadcrumb و محصولات مرتبط", async ({ page }) => {
    await page.goto("/products/gas-capsule-refill-11kg");
    const crumbs = page.getByRole("navigation", { name: /breadcrumb|مسیر/i });
    await expect(
      crumbs
        .getByRole("link", { name: "قیمت شارژ کپسول گاز" })
        .or(crumbs.getByRole("link", { name: "شارژ کپسول گاز" }))
        .first(),
    ).toBeVisible();
    // اول محصول متناظر
    const first = page
      .locator("#related-title")
      .locator("xpath=ancestor::section")
      .locator("article a")
      .first();
    await expect(first).toHaveAttribute(
      "href",
      /\/products\/buy-gas-capsule-11kg/,
    );

    // دسته‌ی noindex ⇒ «محصولات» به‌جای دسته
    await page.goto("/products/oxygen-capsule-refill");
    const oxygenCrumbs = page.getByRole("navigation", {
      name: /breadcrumb|مسیر/i,
    });
    await expect(
      oxygenCrumbs.getByRole("link", { name: "محصولات" }),
    ).toHaveAttribute("href", "/products");
    await expect(
      oxygenCrumbs.getByRole("link", { name: "سایر گازها" }),
    ).toHaveCount(0);
    const crumbList = (await jsonLd(page)).find(
      (i) => typeOf(i) === "BreadcrumbList",
    ) as {
      itemListElement: { name: string }[];
    };
    expect(crumbList.itemListElement.map((i) => i.name)).toContain("محصولات");
  });
});

test("sitemap.xml: ۱۰ محصول و hubها؛ بدون پیک‌نیک، دست دوم، دسته‌های noindex و پارامتر", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]!).pathname + new URL(m[1]!).search,
  );
  for (const size of ["11", "25", "33", "50"]) {
    expect(paths).toContain(`/products/gas-capsule-refill-${size}kg`);
    expect(paths).toContain(`/products/buy-gas-capsule-${size}kg`);
  }
  expect(paths).toEqual(
    expect.arrayContaining([
      "/",
      "/products",
      "/category/gas-capsule-refill",
      "/category/buy-gas-capsule",
      "/products/oxygen-capsule-refill",
      "/products/industrial-gas-refill",
      "/about",
      "/contact",
    ]),
  );
  for (const url of [
    "/products/picnic-gas",
    "/products/used-gas-capsule",
    "/category/picnic",
    "/category/used-gas-capsules",
    "/category/other-gases",
  ]) {
    expect(paths).not.toContain(url);
  }
  expect(paths.some((p) => p.includes("?"))).toBe(false);
});
