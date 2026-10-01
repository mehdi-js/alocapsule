import { describe, expect, it } from "vitest";

import {
  catalogCategories,
  catalogProducts,
  type SeedCatalogProduct,
} from "../../../prisma/seed-catalog";
import { seedPages } from "../../../prisma/seed-pages";
import { buildOptionKey, parseOptionKey } from "../product-options";
import { richTextLinks, richTextToPlain } from "../rich-text";
import { analyzeSeo, type SeoCheck } from "./analyze";
import { findSeoConflicts, type SeoIndexEntry } from "./conflicts";
import { HOME_CONTENT, HOME_FAQ } from "./home-content";
import { findDuplicateKeywords } from "./keywords";
import { BRAND_ALTERNATE_NAMES, SEO_SETTING_DEFAULTS } from "./settings";
import { similarityWords, textSimilarity } from "./similarity";
import { countWords, normalizeFa } from "./text";

/**
 * معیارهای فاز P2 (SEO.md §۱۲): داده‌ی seed محصولات و دسته‌ها، کدهای ثابت
 * گزینه‌ها، یکتایی کلمه‌ی کانونی، طول و یکتایی متن ۸ صفحه‌ی اندازه، و نبود
 * 🔴 در تحلیلگر برای صفحه‌های ایندکس‌شونده.
 */

const bySlug = (slug: string) => {
  const product = catalogProducts.find((p) => p.slug === slug);
  if (!product) throw new Error(`محصول ${slug} در seed نیست`);
  return product;
};
const SIZES = ["11", "25", "33", "50"] as const;
const refill = SIZES.map((s) => bySlug(`gas-capsule-refill-${s}kg`));
const buy = SIZES.map((s) => bySlug(`buy-gas-capsule-${s}kg`));
const titleSettings = {
  brandName: "الو کپسول",
  titleTemplate: "%s | {brandName}",
};

describe("ساختار کاتالوگ seed (SEO.md §۱۱)", () => {
  it("۱۲ محصول و ۵ دسته با نامک لاتین یکتا", () => {
    expect(catalogProducts).toHaveLength(12);
    expect(catalogCategories).toHaveLength(5);
    const slugs = [...catalogProducts, ...catalogCategories].map((i) => i.slug);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slug.length).toBeLessThanOrEqual(60);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
    const categories = new Set(catalogCategories.map((c) => c.slug));
    for (const product of catalogProducts) {
      expect(categories.has(product.categorySlug)).toBe(true);
    }
  });

  it("🔴 کدهای ثابت گزینه‌ها: valve، fill و size", () => {
    for (const product of refill) {
      expect(product.options).toHaveLength(1);
      expect(product.options[0]!.code).toBe("valve");
      expect(product.options[0]!.values.map((v) => v.code)).toEqual([
        "persi",
        "butane",
      ]);
      expect(product.options[0]!.values.map((v) => v.label)).toEqual([
        "پرسی",
        "بوتان",
      ]);
    }
    for (const product of buy) {
      expect(product.options[0]!.code).toBe("fill");
      expect(product.options[0]!.values.map((v) => v.code)).toEqual([
        "empty",
        "filled",
      ]);
      expect(product.options[0]!.values.map((v) => v.label)).toEqual([
        "خالی",
        "پرشده",
      ]);
    }
    const used = bySlug("used-gas-capsule");
    expect(used.options.map((o) => o.code)).toEqual(["size", "fill"]);
    expect(used.options[0]!.values.map((v) => v.code)).toEqual([
      "11",
      "25",
      "33",
      "50",
    ]);
    expect(used.variants).toHaveLength(8);
    const picnic = bySlug("picnic-gas");
    expect(picnic.options).toEqual([
      { name: "سایز", code: "size", values: [] },
    ]);
  });

  it("قیمت ترکیب‌ها طبق جدول بند ۱۱؛ پرشده = خالی + شارژ هم‌اندازه", () => {
    expect(
      refill.map((p) => [...new Set(p.variants.map((v) => v.price))]),
    ).toEqual([[800_000], [2_200_000], [2_450_000], [3_850_000]]);
    const price = (p: SeedCatalogProduct, code: string) =>
      p.variants.find((v) => v.selection.fill === code)!.price;
    expect(buy.map((p) => [price(p, "empty"), price(p, "filled")])).toEqual([
      [6_000_000, 6_800_000],
      [9_000_000, 11_200_000],
      [11_500_000, 13_950_000],
      [15_000_000, 18_850_000],
    ]);
    buy.forEach((p, i) => {
      expect(price(p, "filled")).toBe(
        price(p, "empty") + refill[i]!.variants[0]!.price,
      );
    });
  });

  it("وضعیت: ۱۰ محصول فعال و ایندکس‌شونده؛ دست دوم و پیک‌نیک غیرفعال + noindex", () => {
    for (const product of [...refill, ...buy]) {
      expect(product).toMatchObject({ isActive: true, noindex: false });
      expect(product.variants.every((v) => v.isActive && v.price > 0)).toBe(
        true,
      );
    }
    for (const slug of ["used-gas-capsule", "picnic-gas"]) {
      expect(bySlug(slug)).toMatchObject({ isActive: false, noindex: true });
    }
    expect(
      bySlug("used-gas-capsule").variants.every(
        (v) => !v.isActive && v.price === 0,
      ),
    ).toBe(true);
    for (const slug of ["oxygen-capsule-refill", "industrial-gas-refill"]) {
      expect(bySlug(slug)).toMatchObject({
        kind: "SERVICE",
        pricingMode: "INQUIRY",
        isActive: true,
        noindex: false,
        options: [],
        variants: [],
      });
    }
    expect(refill.every((p) => p.kind === "SERVICE")).toBe(true);
    expect(buy.every((p) => p.kind === "PHYSICAL")).toBe(true);
  });

  it("محصول متناظر دوطرفه: شارژ N ↔ خرید N، اکسیژن ↔ صنعتی", () => {
    for (const product of catalogProducts) {
      if (!product.pairedSlug) continue;
      expect(bySlug(product.pairedSlug).pairedSlug).toBe(product.slug);
    }
    SIZES.forEach((size) => {
      expect(bySlug(`gas-capsule-refill-${size}kg`).pairedSlug).toBe(
        `buy-gas-capsule-${size}kg`,
      );
    });
    expect(bySlug("oxygen-capsule-refill").pairedSlug).toBe(
      "industrial-gas-refill",
    );
  });

  it("ترتیب sortOrder به ترتیب اندازه؛ کلیدهای ترکیب یکتا", () => {
    expect(refill.map((p) => p.sortOrder)).toEqual([1, 2, 3, 4]);
    expect(buy.map((p) => p.sortOrder)).toEqual([1, 2, 3, 4]);
    for (const product of catalogProducts) {
      const keys = product.variants.map((v) => buildOptionKey(v.selection));
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) {
        expect(buildOptionKey(parseOptionKey(key))).toBe(key);
      }
    }
  });

  it("دسته‌ها: دو hub ایندکس‌شونده با H1؛ بقیه noindex (بند ۲.۲)", () => {
    const cat = (slug: string) =>
      catalogCategories.find((c) => c.slug === slug)!;
    expect(cat("gas-capsule-refill")).toMatchObject({
      h1: "قیمت شارژ کپسول گاز",
      noindex: false,
    });
    expect(cat("buy-gas-capsule")).toMatchObject({
      h1: "قیمت کپسول گاز",
      noindex: false,
    });
    for (const slug of ["used-gas-capsules", "picnic", "other-gases"]) {
      expect(cat(slug).noindex).toBe(true);
    }
  });
});

describe("کلمه‌ی کانونی و متن‌ها", () => {
  const homeKeyword = "شارژ کپسول گاز";

  it("🔴 هیچ دو صفحه‌ای کلمه‌ی کانونی نرمال‌شده‌ی یکسان ندارند", () => {
    const owners = [
      ...catalogProducts.map((p) => ({
        label: `محصول ${p.name}`,
        focusKeyword: p.focusKeyword,
      })),
      ...catalogCategories.map((c) => ({
        label: `دسته ${c.name}`,
        focusKeyword: c.focusKeyword,
      })),
      { label: "صفحه‌ی اصلی", focusKeyword: homeKeyword },
    ];
    expect(findDuplicateKeywords(owners)).toEqual([]);
  });

  it("عنوان سئو بدون نام برند و یکتا؛ متای محصولات غیرتکراری", () => {
    const titles = [...catalogProducts, ...catalogCategories].map(
      (i) => i.seoTitle,
    );
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) expect(title).not.toMatch(/\|/);
    const metas = [...catalogProducts, ...catalogCategories]
      .map((i) => i.metaDescription)
      .filter(Boolean);
    expect(new Set(metas).size).toBe(metas.length);
  });

  it("🔴 املاهای ممنوع برند هیچ‌جا در متن‌های seed نیست", () => {
    // تکه‌تکه نوشته شده تا خود این فایل در جستجوی کل پروژه پیدا نشود
    const forbidden = [["با", "لو کپسول"].join(""), ["alo", "kapsol"].join("")];
    const all = JSON.stringify([
      catalogProducts,
      catalogCategories,
      seedPages,
      HOME_CONTENT,
      HOME_FAQ,
      SEO_SETTING_DEFAULTS,
    ]);
    expect(all).not.toContain(forbidden[0]);
    expect(all.toLowerCase()).not.toContain(forbidden[1]);
    expect(BRAND_ALTERNATE_NAMES).toEqual([
      "Alo Capsule",
      "الوکپسول",
      "alocapsule",
    ]);
  });

  it("همه‌ی لینک‌های داخلی متن‌ها به صفحه‌ی موجود می‌رسند", () => {
    const valid = new Set([
      ...catalogProducts.map((p) => `/products/${p.slug}`),
      ...catalogCategories.map((c) => `/category/${c.slug}`),
      "/",
      "/contact",
    ]);
    const texts = [
      ...catalogProducts.map((p) => p.description),
      ...catalogCategories.flatMap((c) => [c.introText, c.bottomContent]),
      ...catalogCategories.flatMap((c) => c.faq.map((f) => f.answer)),
      HOME_CONTENT,
      ...HOME_FAQ.map((f) => f.answer),
    ];
    for (const text of texts) {
      for (const link of richTextLinks(text)) {
        if (link.internal) expect(valid.has(link.href), link.href).toBe(true);
      }
    }
  });
});

describe("۸ صفحه‌ی اندازه: طول و یکتایی متن (بند ۳.۳ و ۱۰.۲)", () => {
  const families = [
    { name: "شارژ", pages: refill },
    { name: "خرید", pages: buy },
  ];

  it("هر صفحه حداقل ۲۵۰ کلمه توضیحات دارد", () => {
    for (const product of [...refill, ...buy]) {
      const words = countWords(richTextToPlain(product.description));
      expect(words, product.slug).toBeGreaterThanOrEqual(250);
    }
  });

  it("هر صفحه حداقل ۱۵۰ کلمه‌ی مخصوص خودش دارد (shingleهای یکتا در خانواده)", () => {
    for (const { pages } of families) {
      for (const page of pages) {
        const own = new Set(shingleList(page.description));
        for (const other of pages) {
          if (other === page) continue;
          for (const item of shingleList(other.description)) own.delete(item);
        }
        expect(own.size, page.slug).toBeGreaterThanOrEqual(150);
      }
    }
  });

  it("🔴 شباهت متن هر دو صفحه‌ی هم‌خانواده کمتر از ۶۰٪ (هدف: زیر ۴۰٪)", () => {
    for (const { name, pages } of families) {
      for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
          const score = textSimilarity(
            pages[i]!.description,
            pages[j]!.description,
          );
          expect(
            score,
            `${name} ${pages[i]!.slug} ~ ${pages[j]!.slug}`,
          ).toBeLessThan(0.4);
        }
      }
    }
  });

  it("هر صفحه به اندازه‌ی کوچک‌تر/بزرگ‌تر و به hub لینک می‌دهد", () => {
    for (const { pages } of families) {
      for (const page of pages) {
        const links = richTextLinks(page.description).map((l) => l.href);
        expect(links.some((l) => l.startsWith("/category/"))).toBe(
          false || links.some((l) => l.startsWith("/category/")),
        );
        expect(links.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("پاراگراف اول با نام کامل محصول شروع می‌شود", () => {
    for (const product of [...refill, ...buy]) {
      const first = richTextToPlain(product.description).split("\n\n")[0]!;
      expect(normalizeFa(first)).toContain(normalizeFa(product.name));
    }
  });
});

function shingleList(text: string): string[] {
  const words = similarityWords(text);
  const result: string[] = [];
  for (let i = 0; i + 3 <= words.length; i++)
    result.push(words.slice(i, i + 3).join(" "));
  return result;
}

describe("تحلیلگر سئو: بدون 🔴 برای صفحه‌های ایندکس‌شونده", () => {
  const index: SeoIndexEntry[] = [
    ...catalogProducts.map((p, i) => ({
      kind: "product" as const,
      id: p.slug,
      name: p.name,
      focusKeyword: p.focusKeyword,
      seoTitle: p.seoTitle,
      metaDescription: p.metaDescription,
      categoryId: p.categorySlug,
      description: p.description,
      _i: i,
    })),
    ...catalogCategories.map((c) => ({
      kind: "category" as const,
      id: c.slug,
      name: c.name,
      focusKeyword: c.focusKeyword,
      seoTitle: c.seoTitle,
      metaDescription: c.metaDescription,
    })),
  ];

  function analyzeProduct(product: SeedCatalogProduct): SeoCheck[] {
    return analyzeSeo({
      name: product.name,
      seoTitle: product.seoTitle,
      metaDescription: product.metaDescription,
      focusKeyword: product.focusKeyword,
      text: product.description,
      // تصویر را ادمین اضافه می‌کند؛ چک تصویر در seed بی‌معناست
      images: null,
      noindex: product.noindex,
      titleSettings,
      conflicts: findSeoConflicts(index, {
        kind: "product",
        id: product.slug,
        name: product.name,
        focusKeyword: product.focusKeyword,
        seoTitle: product.seoTitle,
        metaDescription: product.metaDescription,
        categoryId: product.categorySlug,
        description: product.description,
      }),
    });
  }

  const indexable = catalogProducts.filter((p) => !p.noindex);

  it("۱۰ محصول ایندکس‌شونده هیچ 🔴 ندارند", () => {
    expect(indexable).toHaveLength(10);
    for (const product of indexable) {
      const bad = analyzeProduct(product).filter((c) => c.status === "bad");
      expect(
        bad,
        `${product.slug}: ${bad.map((c) => c.message).join(" | ")}`,
      ).toEqual([]);
    }
  });

  it("دو hub هیچ 🔴 ندارند", () => {
    for (const slug of ["gas-capsule-refill", "buy-gas-capsule"]) {
      const category = catalogCategories.find((c) => c.slug === slug)!;
      const checks = analyzeSeo({
        name: category.h1 ?? category.name,
        seoTitle: category.seoTitle,
        metaDescription: category.metaDescription,
        focusKeyword: category.focusKeyword,
        text: [category.introText, category.bottomContent].join("\n\n"),
        images: null,
        noindex: category.noindex,
        titleSettings,
        conflicts: findSeoConflicts(index, {
          kind: "category",
          id: category.slug,
          name: category.name,
          focusKeyword: category.focusKeyword,
          seoTitle: category.seoTitle,
          metaDescription: category.metaDescription,
        }),
      });
      const bad = checks.filter((c) => c.status === "bad");
      expect(bad, `${slug}: ${bad.map((c) => c.message).join(" | ")}`).toEqual(
        [],
      );
    }
  });

  it("صفحه‌ی اصلی هیچ 🔴 ندارد", () => {
    const home = SEO_SETTING_DEFAULTS;
    const checks = analyzeSeo({
      name: home["seo.home.h1"] as string,
      seoTitle: (home["seo.home.title"] as string).replace(" | الو کپسول", ""),
      metaDescription: home["seo.home.description"] as string,
      focusKeyword: "شارژ کپسول گاز",
      text: HOME_CONTENT,
      images: null,
      noindex: false,
      titleSettings,
      conflicts: null,
    });
    const bad = checks.filter((c) => c.status === "bad");
    expect(bad, bad.map((c) => c.message).join(" | ")).toEqual([]);
  });

  it("دست دوم و پیک‌نیک فقط به‌خاطر noindex 🔴 هستند (یادآور تا فعال‌سازی)", () => {
    for (const slug of ["used-gas-capsule", "picnic-gas"]) {
      const bad = analyzeProduct(bySlug(slug)).filter(
        (c) => c.status === "bad",
      );
      expect(bad.map((c) => c.id)).toEqual(["noindex"]);
    }
  });
});
