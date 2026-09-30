import { describe, expect, it } from "vitest";

import {
  catalogCategories,
  catalogProducts,
} from "../../../prisma/seed-catalog";
import { getVariantTitle } from "../unit";
import { findDuplicateKeywords } from "./keywords";

describe("findDuplicateKeywords", () => {
  it("املای متفاوت یک عبارت تکراری حساب می‌شود", () => {
    expect(
      findDuplicateKeywords([
        { label: "الف", focusKeyword: "شارژ کپسول‌گاز" },
        { label: "ب", focusKeyword: "شارژ کپسول گاز" },
        { label: "ج", focusKeyword: "خرید کپسول گاز" },
        { label: "د", focusKeyword: null },
        { label: "ه", focusKeyword: "" },
      ]),
    ).toEqual([{ keyword: "شارژ کپسول گاز", labels: ["الف", "ب"] }]);
  });
});

/** داده‌ی نمونه‌ی seed (بخش ۶.۱ `FORK.md`) */
describe("کاتالوگ seed", () => {
  it("۴ محصول و ۴ دسته با نامک لاتین یکتا", () => {
    expect(catalogProducts).toHaveLength(4);
    expect(catalogCategories).toHaveLength(4);
    const slugs = [...catalogProducts, ...catalogCategories].map((i) => i.slug);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slug.length).toBeLessThanOrEqual(60);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("هر محصول به دسته‌ی موجود اشاره می‌کند", () => {
    const categories = new Set(catalogCategories.map((c) => c.slug));
    for (const product of catalogProducts) {
      expect(categories.has(product.categorySlug)).toBe(true);
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

  it("عنوان سئو بدون نام برند (قالب خودش اضافه می‌کند) و یکتا", () => {
    const titles = [...catalogProducts, ...catalogCategories].map(
      (item) => item.seoTitle,
    );
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) expect(title).not.toMatch(/\|/);
  });

  it("شارژ بوتان: ۴ متغیر ۱۱ / ۲۵ / ۳۳ / ۵۰ کیلوگرم با قیمت‌های سند", () => {
    const charge = catalogProducts.find((p) => p.slug === "charge-butane")!;
    expect(charge.isActive).toBe(true);
    expect(charge.variants.map((v) => v.price)).toEqual([
      800_000, 2_200_000, 2_450_000, 3_850_000,
    ]);
    expect(
      charge.variants.map((v) => getVariantTitle(charge.unit, v.unitValue)),
    ).toEqual(["۱۱ کیلوگرم", "۲۵ کیلوگرم", "۳۳ کیلوگرم", "۵۰ کیلوگرم"]);
  });

  it("محصول فیزیکی ۱۱ کیلویی ۶٬۰۰۰٬۰۰۰ و اکسیژن استعلامی بدون متغیر", () => {
    const buy = catalogProducts.find((p) => p.slug === "buy-cylinder-11kg")!;
    expect(buy.variants).toHaveLength(1);
    expect(buy.variants[0]!.price).toBe(6_000_000);
    const oxygen = catalogProducts.find(
      (p) => p.slug === "charge-oxygen-40kg",
    )!;
    expect(oxygen.variants).toHaveLength(0);
    expect(oxygen.pricingMode).toBe("INQUIRY");
    expect(oxygen.kind).toBe("SERVICE");
    expect(oxygen.isActive).toBe(true);
  });

  it("هر ۴ ترکیب نوع و حالت قیمت در محصولات نمونه هست", () => {
    const combos = catalogProducts.map((p) => `${p.kind}/${p.pricingMode}`);
    expect(new Set(combos)).toEqual(
      new Set(["SERVICE/FIXED", "PHYSICAL/FIXED", "SERVICE/INQUIRY"]),
    );
    // قیمت‌دار ⇒ حداقل یک متغیر؛ استعلامی ⇒ هیچ
    for (const product of catalogProducts) {
      if (product.pricingMode === "INQUIRY") {
        expect(product.variants).toHaveLength(0);
      } else {
        expect(product.variants.length).toBeGreaterThan(0);
      }
    }
  });

  it("متغیرها یکتا در هر محصول و وزن ارسال معتبر", () => {
    for (const product of catalogProducts) {
      const values = product.variants.map((v) => v.unitValue);
      expect(new Set(values).size).toBe(values.length);
      for (const variant of product.variants) {
        expect(variant.shippingWeightGrams).toBeGreaterThan(0);
        expect(variant.price).toBeGreaterThan(0);
      }
    }
  });
});
