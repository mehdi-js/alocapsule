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
  siteUrl: "https://alihan.ir",
  brandName: "علی حان",
  titleTemplate: "%s | {brandName}",
  defaultDescription: "پیش‌فرض",
  defaultOgImage: null,
  allowIndexing: true,
};

const product = {
  name: "باقلوا گردویی",
  slug: "baklava-gerdouyi",
  seoTitle: "خرید باقلوا گردویی اصل و تازه",
  metaDescription: null,
  description: "باقلوا گردویی با مغز گردوی تازه.",
  noindex: false,
  canonicalUrl: null,
  image: {
    url: "/api/media/products/baklava-gerdouyi-1-a3f9-og.jpg",
    width: 1200,
    height: 630,
    alt: "باقلوا",
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
    expect(meta.title).toBe("خرید باقلوا گردویی اصل و تازه");
    expect(meta.alternates?.canonical).toBe(
      "https://alihan.ir/products/baklava-gerdouyi",
    );
    expect(meta.description).toBe("باقلوا گردویی با مغز گردوی تازه.");
    expect(meta.openGraph).toMatchObject({
      title: "خرید باقلوا گردویی اصل و تازه | علی حان",
      locale: "fa_IR",
      url: "https://alihan.ir/products/baklava-gerdouyi",
      images: [
        {
          url: "https://alihan.ir/api/media/products/baklava-gerdouyi-1-a3f9-og.jpg",
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
    expect(meta.alternates?.canonical).toBe("https://alihan.ir/products/other");
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("صفحه‌ی اصلی و layout", () => {
  it("عنوان absolute", () => {
    const meta = buildHomeMetadata(context, {
      title: "خرید باقلوای ترکی اصل و تازه | علی حان",
      description: "متا",
    });
    expect(meta.title).toEqual({
      absolute: "خرید باقلوای ترکی اصل و تازه | علی حان",
    });
    expect(meta.alternates?.canonical).toBe("https://alihan.ir/");
  });

  it("قالب عنوان از brandName و متای تأیید گوگل/بینگ", () => {
    const meta = buildRootMetadata(context, {
      homeTitle: "خانه",
      verification: { google: "g-code", bing: "b-code" },
    });
    expect(meta.title).toEqual({ default: "خانه", template: "%s | علی حان" });
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
      "https://alihan.ir/category/chocolate?page=2",
    );
  });
});
