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

describe("findSeoConflicts: شباهت متن هم‌دسته", () => {
  const text =
    "شارژ کپسول گاز برای مصرف خانگی مناسب است و کپسول خالی شما با کپسول پرشده تعویض می‌شود";
  const entry = (
    id: string,
    categoryId: string,
    description: string,
  ): SeoIndexEntry => ({
    kind: "product",
    id,
    name: `محصول ${id}`,
    focusKeyword: null,
    seoTitle: null,
    metaDescription: null,
    categoryId,
    description,
  });
  const target = {
    kind: "product" as const,
    id: "p0",
    name: "محصول p0",
    focusKeyword: null,
    seoTitle: null,
    metaDescription: null,
    categoryId: "c1",
    description: text,
  };

  it("فقط محصولات همان دسته و با ارقام نادیده‌گرفته‌شده مقایسه می‌شوند", () => {
    const result = findSeoConflicts(
      [
        entry("p1", "c1", text.replace("خانگی", "خانگی")),
        entry("p2", "c2", text),
        entry(
          "p3",
          "c1",
          "پیک نیک سبک برای سفر و کمپینگ با ابعاد کوچک و قابل حمل",
        ),
      ],
      target,
    );
    expect(result.similarText).toEqual([
      { name: "محصول «محصول p1»", score: 1 },
      { name: "محصول «محصول p3»", score: 0 },
    ]);
  });

  it("بدون توضیحات یا دسته ⇒ similarText نیست (دسته‌ها و محصول جدید)", () => {
    expect(
      findSeoConflicts([entry("p1", "c1", text)], {
        ...target,
        description: null,
      }).similarText,
    ).toBeUndefined();
    expect(
      findSeoConflicts([entry("p1", "c1", text)], {
        ...target,
        categoryId: null,
      }).similarText,
    ).toBeUndefined();
  });
});
