import { describe, expect, it } from "vitest";

import { findSeoConflicts, type SeoIndexEntry } from "./conflicts";

const index: SeoIndexEntry[] = [
  {
    kind: "product",
    id: "p1",
    name: "باقلوا پسته‌ای",
    focusKeyword: "باقلوا پسته‌ای",
    seoTitle: "خرید باقلوا پسته‌ای اصل",
    metaDescription: "متای یک",
  },
  {
    kind: "category",
    id: "c1",
    name: "باقلوا",
    focusKeyword: "انواع باقلوا",
    seoTitle: null,
    metaDescription: null,
  },
];

describe("findSeoConflicts", () => {
  it("کلمه، عنوان و متای تکراری (نرمال‌شده) با نام رقیب", () => {
    expect(
      findSeoConflicts(index, {
        kind: "product",
        id: "p2",
        name: "باقلوا پسته ای ویژه",
        focusKeyword: "باقلوا پسته اي",
        seoTitle: "خرید باقلوا پسته ای اصل",
        metaDescription: "متای  یک",
      }),
    ).toEqual({
      focusKeyword: ["محصول «باقلوا پسته‌ای»"],
      seoTitle: ["محصول «باقلوا پسته‌ای»"],
      metaDescription: ["محصول «باقلوا پسته‌ای»"],
    });
  });

  it("خودش رقیب خودش نیست؛ محصول و دسته با شناسه‌ی یکسان جدا هستند", () => {
    const self = { ...index[0]!, kind: "product" as const };
    expect(findSeoConflicts(index, self)).toEqual({
      focusKeyword: [],
      seoTitle: [],
      metaDescription: [],
    });
  });

  it("عنوان خالی ⇒ نام مقایسه می‌شود؛ مقدار خالی تکراری نیست", () => {
    const result = findSeoConflicts(index, {
      kind: "product",
      id: null,
      name: "باقلوا",
      focusKeyword: "",
      seoTitle: "",
      metaDescription: null,
    });
    expect(result).toEqual({
      focusKeyword: [],
      seoTitle: ["دسته «باقلوا»"],
      metaDescription: [],
    });
  });
});
