import { describe, expect, it } from "vitest";

import { listingCanonicalPath } from "./canonical";
import {
  buildCategoryMetadata,
  buildHomeMetadata,
  buildPageMetadata,
  buildProductMetadata,
  buildRootMetadata,
  robotsFor,
  type SeoContext,
} from "./metadata";

const context: SeoContext = {
  siteUrl: "https://alocapsule.ir",
  brandName: "الو کپسول",
  titleTemplate: "%s | {brandName}",
  defaultDescription: "پیش‌فرض",
  defaultOgImage: null,
  allowIndexing: true,
};

const product = {
  name: "شارژ بوتان",
  slug: "charge-butane",
  seoTitle: "خرید شارژ بوتان اصل و تازه",
  metaDescription: null,
  description: "شارژ بوتان با مغز گردوی تازه.",
  noindex: false,
  canonicalUrl: null,
  image: {
    url: "/api/media/products/charge-butane-1-a3f9-og.jpg",
    width: 1200,
    height: 630,
    alt: "کپسول",
  },
};

describe("robots و ALLOW_INDEXING", () => {
  it("بسته ⇒ noindex, nofollow روی همه؛ noindex صفحه ⇒ noindex, follow", () => {
    expect(robotsFor({ allowIndexing: false })).toEqual({
      index: false,
      follow: false,
    });
    expect(robotsFor({ allowIndexing: false }, false)).toEqual({
      index: false,
      follow: false,
    });
    expect(robotsFor({ allowIndexing: true }, true)).toEqual({
      index: false,
      follow: true,
    });
    expect(robotsFor({ allowIndexing: true })).toEqual({
      index: true,
      follow: true,
    });
    const closed = buildProductMetadata(
      { ...context, allowIndexing: false },
      product,
    );
    expect(closed.robots).toEqual({ index: false, follow: false });
  });
});

describe("buildProductMetadata", () => {
  it("عنوان بدون برند (قالب layout)، OG با عنوان کامل، canonical مطلق، متای خودکار", () => {
    const meta = buildProductMetadata(context, product);
    expect(meta.title).toBe("خرید شارژ بوتان اصل و تازه");
    expect(meta.alternates?.canonical).toBe(
      "https://alocapsule.ir/products/charge-butane",
    );
    expect(meta.description).toBe("شارژ بوتان با مغز گردوی تازه.");
    expect(meta.openGraph).toMatchObject({
      title: "خرید شارژ بوتان اصل و تازه | الو کپسول",
      locale: "fa_IR",
      url: "https://alocapsule.ir/products/charge-butane",
      images: [
        {
          url: "https://alocapsule.ir/api/media/products/charge-butane-1-a3f9-og.jpg",
          width: 1200,
          height: 630,
        },
      ],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    expect(JSON.stringify(meta)).not.toContain("keywords");
  });

  it("canonical سفارشی و noindex", () => {
    const meta = buildProductMetadata(context, {
      ...product,
      canonicalUrl: "/products/other",
      noindex: true,
    });
    expect(meta.alternates?.canonical).toBe(
      "https://alocapsule.ir/products/other",
    );
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("صفحه‌ی اصلی و layout", () => {
  it("عنوان absolute", () => {
    const meta = buildHomeMetadata(context, {
      title: "خرید کپسولی ترکی اصل و تازه | الو کپسول",
      description: "متا",
    });
    expect(meta.title).toEqual({
      absolute: "خرید کپسولی ترکی اصل و تازه | الو کپسول",
    });
    expect(meta.alternates?.canonical).toBe("https://alocapsule.ir/");
  });

  it("قالب عنوان از brandName و متای تأیید گوگل/بینگ", () => {
    const meta = buildRootMetadata(context, {
      homeTitle: "خانه",
      verification: { google: "g-code", bing: "b-code" },
    });
    expect(meta.title).toEqual({ default: "خانه", template: "%s | الو کپسول" });
    expect(meta.verification).toEqual({
      google: "g-code",
      other: { "msvalidate.01": "b-code" },
    });
    const empty = buildRootMetadata(context, {
      homeTitle: "خانه",
      verification: { google: null, bing: null },
    });
    expect(empty.verification).toEqual({});
  });
});

describe("canonical فهرست‌ها (SEO.md §۴.۲)", () => {
  it("sort/فیلتر ⇒ آدرس تمیز؛ page=2 ⇒ خودش؛ page=1 بدون پارامتر", () => {
    expect(listingCanonicalPath("/products", { page: 1, filtered: true })).toBe(
      "/products",
    );
    expect(
      listingCanonicalPath("/products", { page: 2, filtered: false }),
    ).toBe("/products?page=2");
    expect(
      listingCanonicalPath("/products", { page: 1, filtered: false }),
    ).toBe("/products");
    expect(listingCanonicalPath("/products", { page: 3, filtered: true })).toBe(
      "/products",
    );
  });

  it("جستجو ⇒ noindex, follow؛ دسته‌ی noindex", () => {
    const search = buildPageMetadata(context, {
      title: "همه محصولات",
      description: null,
      path: "/products",
      listing: { page: 1, filtered: true, search: true },
    });
    expect(search.robots).toEqual({ index: false, follow: true });
    const category = buildCategoryMetadata(
      context,
      {
        name: "شکلات",
        slug: "chocolate",
        seoTitle: "شکلات",
        metaDescription: null,
        text: "متن",
        noindex: true,
      },
      { page: 2, filtered: false, search: false },
    );
    expect(category.robots).toEqual({ index: false, follow: true });
    expect(category.alternates?.canonical).toBe(
      "https://alocapsule.ir/category/chocolate?page=2",
    );
  });
});
