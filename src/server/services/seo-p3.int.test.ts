import { randomBytes } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { db } from "@/lib/db";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";

import { getLocalBusinessJsonLd } from "./business-schema.service";
import {
  getProductPage,
  listFeaturedCategories,
  listRelatedProducts,
} from "./catalog-page.service";

/**
 * P3 (SEO.md §۵، §۶، §۸) روی داده‌ی seed: JSON-LD محصول، LocalBusiness،
 * sitemap، محصولات مرتبط، breadcrumb، کارت‌های صفحه‌ی اصلی و noindex دسته‌ها.
 */

const RUN = randomBytes(3).toString("hex");
const categoryIds: string[] = [];

afterAll(async () => {
  await db.category.deleteMany({ where: { id: { in: categoryIds } } });
  await db.$disconnect();
});

async function page(slug: string) {
  const lookup = await getProductPage(slug);
  if (lookup.kind !== "found") throw new Error(`${slug} پیدا نشد`);
  return lookup.data;
}

function schema(product: Awaited<ReturnType<typeof page>>) {
  return productJsonLd({
    siteUrl: "https://alocapsule.ir",
    brandName: "الو کپسول",
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.categoryName,
    images: [],
    variants: product.schemaVariants,
    available: product.available,
  });
}

describe("JSON-LD محصول روی داده‌ی seed", () => {
  it("شارژ ۵۰: Offer ساده با price=38500000 (پرسی و بوتان هم‌قیمت)", async () => {
    expect(schema(await page("gas-capsule-refill-50kg")).offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "IRR",
      price: "38500000",
    });
  });

  it("خرید ۵۰: AggregateOffer با low=150000000 و high=188500000", async () => {
    expect(schema(await page("buy-gas-capsule-50kg")).offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "150000000",
      highPrice: "188500000",
      offerCount: 2,
    });
  });

  it("🔴 اکسیژن و گاز صنعتی (استعلامی): بدون offers؛ دست دوم/پیک‌نیک بی‌قیمت هم همین", async () => {
    for (const slug of [
      "oxygen-capsule-refill",
      "industrial-gas-refill",
      "used-gas-capsule",
      "picnic-gas",
    ]) {
      const data = schema(await page(slug));
      expect(data.offers, slug).toBeUndefined();
      expect(JSON.stringify(data)).not.toMatch(/aggregateRating|"review"/);
    }
  });

  it("breadcrumb: محصول hub ⇒ خانه › hub › نام؛ محصول دسته‌ی noindex ⇒ داده‌ی دسته noindex", async () => {
    const charge = await page("gas-capsule-refill-11kg");
    expect(charge.categoryNoindex).toBe(false);
    expect(charge.categoryTrail.map((c) => c.path)).toEqual([
      "/category/gas-capsule-refill",
    ]);
    const oxygen = await page("oxygen-capsule-refill");
    expect(oxygen.categoryNoindex).toBe(true);
    // مسیر نهایی breadcrumb (مثل صفحه): «محصولات» به‌جای دسته‌ی noindex
    const crumbs = [
      { name: "خانه", path: "/" },
      ...(oxygen.categoryNoindex
        ? [{ name: "محصولات", path: "/products" }]
        : oxygen.categoryTrail),
      { name: oxygen.name, path: `/products/${oxygen.slug}` },
    ];
    const list = breadcrumbJsonLd(crumbs, "https://alocapsule.ir") as {
      itemListElement: { name: string; item: string }[];
    };
    expect(list.itemListElement.map((i) => i.name)).toEqual([
      "خانه",
      "محصولات",
      "شارژ کپسول اکسیژن ۴۰ لیتری",
    ]);
    expect(list.itemListElement[1]!.item).toBe(
      "https://alocapsule.ir/products",
    );
  });
});

describe("LocalBusiness از تنظیمات (SEO.md §۶.۱)", () => {
  it("areaServed تهران، تلفن/ایمیل/آدرس واقعی؛ بدون {{ و بدون ساعات کاری", async () => {
    const data = await getLocalBusinessJsonLd();
    const json = JSON.stringify(data);
    expect(json).not.toContain("{{");
    expect(data).toMatchObject({
      "@type": "LocalBusiness",
      name: "الو کپسول",
      areaServed: { "@type": "City", name: "تهران" },
      telephone: "+989126270595",
      email: "info@alocapsule.ir",
    });
    expect((data.address as { streetAddress: string }).streetAddress).toContain(
      "سولقان",
    );
    expect(json).not.toContain("openingHoursSpecification");
    expect(data.alternateName).toEqual([
      "Alo Capsule",
      "الوکپسول",
      "alocapsule",
    ]);
  });
});

describe("sitemap (SEO.md §۸)", () => {
  const SEED_SLUGS = [
    "gas-capsule-refill-11kg",
    "gas-capsule-refill-25kg",
    "gas-capsule-refill-33kg",
    "gas-capsule-refill-50kg",
    "buy-gas-capsule-11kg",
    "buy-gas-capsule-25kg",
    "buy-gas-capsule-33kg",
    "buy-gas-capsule-50kg",
    "oxygen-capsule-refill",
    "industrial-gas-refill",
  ];

  async function paths() {
    return (await sitemap()).map(
      (entry) => new URL(entry.url).pathname + new URL(entry.url).search,
    );
  }

  it("۱۰ محصول، دو hub، /، /products، /about، /contact؛ بدون پیک‌نیک/دست دوم/دسته‌های noindex/پارامتر", async () => {
    const urls = await paths();
    for (const slug of SEED_SLUGS) expect(urls).toContain(`/products/${slug}`);
    for (const url of [
      "/",
      "/products",
      "/category/gas-capsule-refill",
      "/category/buy-gas-capsule",
      "/about",
      "/contact",
    ]) {
      expect(urls).toContain(url);
    }
    for (const url of [
      "/products/picnic-gas",
      "/products/used-gas-capsule",
      "/category/used-gas-capsules",
      "/category/picnic",
      "/category/other-gases",
    ]) {
      expect(urls).not.toContain(url);
    }
    expect(urls.some((u) => u.includes("?"))).toBe(false);
  });

  it("terms و privacy فقط اگر منتشر شده‌اند؛ faq/shipping/returns هرگز", async () => {
    const before = await paths();
    expect(before).not.toContain("/terms");
    const touched = await db.page.findMany({
      where: { slug: { in: ["terms", "privacy", "faq"] } },
      select: { id: true, isPublished: true },
    });
    try {
      await db.page.updateMany({
        where: { slug: { in: ["terms", "privacy", "faq"] } },
        data: { isPublished: true },
      });
      const after = await paths();
      expect(after).toContain("/terms");
      expect(after).toContain("/privacy");
      expect(after).not.toContain("/faq");
    } finally {
      for (const row of touched) {
        await db.page.update({
          where: { id: row.id },
          data: { isPublished: row.isPublished },
        });
      }
    }
  });
});

describe("دسته‌ها، کارت‌ها و محصولات مرتبط", () => {
  it("دسته‌ی جدید پیش‌فرض noindex است (SEO.md §۷.۴)", async () => {
    const category = await db.category.create({
      data: { name: `دسته ${RUN}`, slug: `p3-cat-${RUN}` },
    });
    categoryIds.push(category.id);
    expect(category.noindex).toBe(true);
  });

  it("کارت‌های صفحه‌ی اصلی: hubها ⇒ دسته؛ سایر گازها ⇒ محصول اکسیژن؛ بدون محصول فعال ⇒ بدون کارت", async () => {
    const paths = (await listFeaturedCategories()).map((card) => card.path);
    expect(paths).toEqual([
      "/category/gas-capsule-refill",
      "/category/buy-gas-capsule",
      "/products/oxygen-capsule-refill",
    ]);
  });

  async function related(slug: string) {
    return (await listRelatedProducts(await page(slug))).map(
      (card) => card.slug,
    );
  }

  it("شارژ ۱۱: اول خرید ۱۱ (متناظر)، بعد هم‌دسته‌ها؛ پیک‌نیک غیرفعال نمی‌آید", async () => {
    expect(await related("gas-capsule-refill-11kg")).toEqual([
      "buy-gas-capsule-11kg",
      "gas-capsule-refill-25kg",
      "gas-capsule-refill-33kg",
      "gas-capsule-refill-50kg",
    ]);
  });

  it("خرید ۲۵: اول شارژ ۲۵؛ اکسیژن ↔ صنعتی", async () => {
    expect((await related("buy-gas-capsule-25kg"))[0]).toBe(
      "gas-capsule-refill-25kg",
    );
    expect(await related("oxygen-capsule-refill")).toEqual([
      "industrial-gas-refill",
    ]);
    expect(await related("industrial-gas-refill")).toEqual([
      "oxygen-capsule-refill",
    ]);
  });

  it("پیک‌نیک و دست دوم پس از فعال شدن (با ترکیب فعال) مرتبط می‌شوند", async () => {
    const picnic = await db.product.findUniqueOrThrow({
      where: { slug: "picnic-gas" },
      include: { options: { include: { values: true } } },
    });
    // سایز موقت + یک ترکیب فعال؛ بعد از تست برگردانده می‌شود
    const option = picnic.options[0]!;
    const value = await db.productOptionValue.create({
      data: { optionId: option.id, label: "۲ کیلویی", code: "2", sortOrder: 0 },
    });
    const variant = await db.productVariant.create({
      data: {
        productId: picnic.id,
        optionKey: "size:2",
        price: 500_000,
        shippingWeightGrams: 2000,
        isActive: true,
        optionValues: { create: { optionValueId: value.id } },
      },
    });
    await db.product.update({
      where: { id: picnic.id },
      data: { isActive: true },
    });
    try {
      const slugs = await related("gas-capsule-refill-11kg");
      expect(slugs.slice(0, 2)).toEqual(["buy-gas-capsule-11kg", "picnic-gas"]);
    } finally {
      await db.product.update({
        where: { id: picnic.id },
        data: { isActive: false },
      });
      await db.productVariant.delete({ where: { id: variant.id } });
      await db.productOptionValue.delete({ where: { id: value.id } });
    }
  });
});
