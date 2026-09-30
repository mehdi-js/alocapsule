import { describe, expect, it } from "vitest";

import {
  buildCatalogHref,
  type CatalogUrlState,
  comparePacks,
  hasActiveFilters,
  packKey,
  parsePackKey,
  toggleValue,
} from "@/lib/catalog-url";

const empty: CatalogUrlState = {
  categorySlugs: [],
  packKeys: [],
  minPrice: null,
  maxPrice: null,
  search: "",
  sort: "featured",
  page: 1,
};

describe("buildCatalogHref", () => {
  it("بدون فیلتر آدرس پایه را می‌دهد", () => {
    expect(buildCatalogHref(empty)).toBe("/products");
    expect(buildCatalogHref(empty, "/category/باقلوا")).toBe(
      "/category/باقلوا",
    );
  });

  it("همه‌ی فیلترها را در query می‌گذارد و کلید بسته‌ها را مرتب می‌کند", () => {
    const href = buildCatalogHref({
      categorySlugs: ["باقلوا", "قطاب"],
      packKeys: ["g1000", "p12", "g500"],
      minPrice: 100000,
      maxPrice: 900000,
      search: "پسته",
      sort: "cheapest",
      page: 2,
    });
    const url = new URL(href, "http://x");
    expect(url.pathname).toBe("/products");
    expect(url.searchParams.get("q")).toBe("پسته");
    expect(url.searchParams.get("category")).toBe("باقلوا,قطاب");
    expect(url.searchParams.get("weight")).toBe("g1000,g500,p12");
    expect(url.searchParams.get("min")).toBe("100000");
    expect(url.searchParams.get("max")).toBe("900000");
    expect(url.searchParams.get("sort")).toBe("cheapest");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("مرتب‌سازی پیش‌فرض و صفحه‌ی ۱ را حذف می‌کند", () => {
    expect(buildCatalogHref({ ...empty, sort: "featured", page: 1 })).toBe(
      "/products",
    );
  });
});

describe("toggleValue / hasActiveFilters", () => {
  it("افزودن و برداشتن", () => {
    expect(toggleValue([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleValue([1, 2], 2)).toEqual([1]);
  });

  it("مرتب‌سازی و صفحه فیلتر حساب نمی‌شوند", () => {
    expect(hasActiveFilters({ ...empty, sort: "newest", page: 3 })).toBe(false);
    expect(hasActiveFilters({ ...empty, minPrice: 0 })).toBe(true);
    expect(hasActiveFilters({ ...empty, search: "x" })).toBe(true);
  });
});

describe("کلید بسته", () => {
  it("رفت‌وبرگشت واحد و مقدار", () => {
    expect(packKey({ unit: "GRAM", value: 500 })).toBe("g500");
    expect(packKey({ unit: "PIECE", value: 12 })).toBe("p12");
    expect(parsePackKey("g500")).toEqual({ unit: "GRAM", value: 500 });
    expect(parsePackKey("p12")).toEqual({ unit: "PIECE", value: 12 });
  });

  it.each(["500", "x12", "g", "g0", "g-5", "g12a", "G500", "g99999999", ""])(
    "%j نامعتبر است",
    (key) => {
      expect(parsePackKey(key)).toBeNull();
    },
  );

  it("۱۲ عددی و ۱۲ گرم دو کلید متفاوت‌اند", () => {
    expect(packKey({ unit: "GRAM", value: 12 })).not.toBe(
      packKey({ unit: "PIECE", value: 12 }),
    );
  });

  it("مرتب‌سازی: اول وزنی‌ها، بعد تعدادی‌ها", () => {
    const sorted = [
      { unit: "PIECE" as const, value: 6 },
      { unit: "GRAM" as const, value: 1000 },
      { unit: "PIECE" as const, value: 1 },
      { unit: "GRAM" as const, value: 250 },
    ].sort(comparePacks);
    expect(sorted.map(packKey)).toEqual(["g250", "g1000", "p1", "p6"]);
  });
});
