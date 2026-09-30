import { describe, expect, it } from "vitest";

import { findSeoConflicts, type SeoIndexEntry } from "./conflicts";

const index: SeoIndexEntry[] = [
  {
    kind: "product",
    id: "p1",
    name: "شارژ اکسیژن",
    focusKeyword: "شارژ اکسیژن",
    seoTitle: "خرید شارژ اکسیژن اصل",
    metaDescription: "متای یک",
  },
  {
    kind: "category",
    id: "c1",
    name: "کپسول",
    focusKeyword: "انواع کپسول",
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
        name: "شارژ اکسیژن ویژه",
        focusKeyword: "شارژ اکسيژن",
        seoTitle: "خرید شارژ اکسیژن اصل",
        metaDescription: "متای  یک",
      }),
    ).toEqual({
      focusKeyword: ["محصول «شارژ اکسیژن»"],
      seoTitle: ["محصول «شارژ اکسیژن»"],
      metaDescription: ["محصول «شارژ اکسیژن»"],
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
      name: "کپسول",
      focusKeyword: "",
      seoTitle: "",
      metaDescription: null,
    });
    expect(result).toEqual({
      focusKeyword: [],
      seoTitle: ["دسته «کپسول»"],
      metaDescription: [],
    });
  });
});
