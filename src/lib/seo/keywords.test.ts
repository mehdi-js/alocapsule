import { describe, expect, it } from "vitest";

import {
  catalogCategories,
  catalogProducts,
} from "../../../prisma/seed-catalog";
import { parseRichText, richTextLinks, richTextToPlain } from "../rich-text";
import { findDuplicateKeywords } from "./keywords";
import { countWords } from "./text";

describe("findDuplicateKeywords", () => {
  it("املای متفاوت یک عبارت تکراری حساب می‌شود", () => {
    expect(
      findDuplicateKeywords([
        { label: "الف", focusKeyword: "باقلوا پسته ای" },
        { label: "ب", focusKeyword: "باقلوا پسته‌ای" },
        { label: "ج", focusKeyword: "باقلوا گردویی" },
        { label: "د", focusKeyword: null },
        { label: "ه", focusKeyword: "" },
      ]),
    ).toEqual([{ keyword: "باقلوا پسته ای", labels: ["الف", "ب"] }]);
  });
});

/** معیارهای تکمیل فاز S0 روی داده‌ی seed (SEO.md §۲ و §۱۳) */
describe("کاتالوگ seed", () => {
  it("۱۲ محصول و ۴ دسته با نامک لاتین", () => {
    expect(catalogProducts).toHaveLength(12);
    expect(catalogCategories).toHaveLength(4);
    for (const { slug } of [...catalogProducts, ...catalogCategories]) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slug.length).toBeLessThanOrEqual(60);
    }
  });

  it("هیچ دو محصول/دسته‌ای کلمه‌ی کانونی یکسان ندارند", () => {
    const owners = [
      ...catalogProducts.map((p) => ({
        label: `محصول ${p.name}`,
        focusKeyword: p.focusKeyword,
      })),
      ...catalogCategories.map((c) => ({
        label: `دسته ${c.name}`,
        focusKeyword: c.focusKeyword,
      })),
    ];
    expect(findDuplicateKeywords(owners)).toEqual([]);
  });

  it("عنوان سئو بدون نام برند و عنوان/متا یکتا", () => {
    const titles = [...catalogProducts, ...catalogCategories].map(
      (item) => item.seoTitle,
    );
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) expect(title).not.toMatch(/علی ?حان|\|/);
    const metas = catalogProducts.map((p) => p.metaDescription);
    expect(new Set(metas).size).toBe(metas.length);
    for (const meta of metas) {
      expect(meta.length).toBeGreaterThanOrEqual(100);
      expect(meta.length).toBeLessThanOrEqual(160);
    }
  });

  it("۴ متن هاویج یکتا و هرکدام حداقل ۲ پاراگراف", () => {
    const havij = catalogProducts.filter((p) => p.categorySlug === "havij");
    expect(havij).toHaveLength(4);
    expect(new Set(havij.map((p) => p.description)).size).toBe(4);
    for (const product of havij) {
      expect(product.description.split("\n\n").length).toBeGreaterThanOrEqual(
        2,
      );
    }
  });

  it("متن دسته‌ها: intro ۴۰ تا ۶۰ و bottomContent ۲۰۰ تا ۳۰۰ کلمه با ۲ H2", () => {
    for (const category of catalogCategories) {
      expect(countWords(category.introText)).toBeGreaterThanOrEqual(40);
      expect(countWords(category.introText)).toBeLessThanOrEqual(60);
      const bottom = richTextToPlain(category.bottomContent);
      expect(countWords(bottom)).toBeGreaterThanOrEqual(200);
      expect(countWords(bottom)).toBeLessThanOrEqual(300);
      const headings = parseRichText(category.bottomContent).filter(
        (block) => block.type === "heading" && block.level === 2,
      );
      expect(headings).toHaveLength(2);
      // لینک‌ها به صفحات همین کاتالوگ اشاره می‌کنند
      const slugs = new Set([
        ...catalogProducts.map((p) => `/products/${p.slug}`),
        ...catalogCategories.map((c) => `/category/${c.slug}`),
      ]);
      for (const link of richTextLinks(category.bottomContent)) {
        expect(slugs.has(link.href)).toBe(true);
      }
    }
  });

  it("دسته‌ی هاویج زیرمجموعه‌ی باقلوا و دسته‌ی شکلات noindex", () => {
    const bySlug = new Map(catalogCategories.map((c) => [c.slug, c]));
    expect(bySlug.get("havij")?.parentSlug).toBe("baklava");
    expect(bySlug.get("chocolate")?.noindex).toBe(true);
  });
});
