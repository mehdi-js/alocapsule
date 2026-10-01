import { describe, expect, it } from "vitest";

import {
  analyzeSeo,
  type SeoAnalysisInput,
  type SeoCheckId,
  type SeoStatus,
  summarizeSeo,
} from "./analyze";

const words = (count: number, word = "کلمه") =>
  Array.from({ length: count }, () => word).join(" ");

/** ورودی «سالم»: همه‌ی چک‌ها سبز */
function base(overrides: Partial<SeoAnalysisInput> = {}): SeoAnalysisInput {
  return {
    name: "شارژ بوتان",
    seoTitle: "خرید شارژ بوتان اصل و تازه",
    metaDescription:
      "شارژ بوتان الو کپسول با مغز گردوی تازه و شربت متعادل؛ طعمی اصیل و خوش‌عطر برای پذیرایی و هدیه. همین حالا آنلاین سفارش دهید.",
    focusKeyword: "شارژ بوتان",
    text: `شارژ بوتان ${words(260)} [کپسول](/category/capsule)`,
    images: [{ alt: "شارژ بوتان الو کپسول", isPrimary: true }],
    noindex: false,
    titleSettings: {
      brandName: "الو کپسول",
      titleTemplate: "%s | {brandName}",
    },
    conflicts: { focusKeyword: [], seoTitle: [], metaDescription: [] },
    ...overrides,
  };
}

function status(
  input: SeoAnalysisInput,
  id: SeoCheckId,
): SeoStatus | undefined {
  return analyzeSeo(input).find((check) => check.id === id)?.status;
}

describe("analyzeSeo", () => {
  it("ورودی سالم ⇒ همه سبز", () => {
    const checks = analyzeSeo(base());
    expect(checks.filter((c) => c.status !== "good")).toEqual([]);
    expect(summarizeSeo(checks).level).toBe("good");
  });

  it("طول عنوان کامل با برند: ۳۰ تا ۶۵", () => {
    // «بوتان | الو کپسول» = ۱۷ کاراکتر
    expect(status(base({ seoTitle: "بوتان" }), "titleLength")).toBe("warn");
    expect(status(base({ seoTitle: "خ".repeat(60) }), "titleLength")).toBe(
      "warn",
    );
    const message = analyzeSeo(base()).find(
      (c) => c.id === "titleLength",
    )?.message;
    // «خرید شارژ بوتان اصل و تازه | الو کپسول» = ۳۸ کاراکتر
    expect(message).toContain("۳۸");
  });

  it("طول متا: ۱۱۰ تا ۱۶۰؛ خالی قرمز", () => {
    expect(status(base({ metaDescription: "کوتاه" }), "metaLength")).toBe(
      "warn",
    );
    expect(status(base({ metaDescription: "" }), "metaLength")).toBe("bad");
    expect(status(base({ metaDescription: null }), "metaLength")).toBe("bad");
  });

  it("کلمه‌ی کانونی در عنوان (قرمز)، H1، متا و ۱۰۰ کلمه‌ی اول", () => {
    expect(
      status(base({ seoTitle: "خرید گاز ترکی اصل و تازه" }), "keywordInTitle"),
    ).toBe("bad");
    expect(status(base({ name: "کپسول" }), "keywordInH1")).toBe("warn");
    expect(
      status(
        base({ metaDescription: `${"متن ".repeat(30)}بدون کلمه` }),
        "keywordInMeta",
      ),
    ).toBe("warn");
    expect(
      status(
        base({ text: `${words(150)} شارژ بوتان ${words(150)}` }),
        "keywordInIntro",
      ),
    ).toBe("warn");
  });

  it("نیم‌فاصله و ي عربی مانع تطبیق نمی‌شود", () => {
    const input = base({
      name: "شارژ اکسیژن",
      seoTitle: "خرید شارژ اکسیژن اصل",
      focusKeyword: "شارژ اکسيژن",
      metaDescription: `شارژ اکسیژن ${"متن ".repeat(28)}`,
      text: `شارژ اکسیژن ${words(260)} [x](/a)`,
    });
    for (const id of [
      "keywordInTitle",
      "keywordInH1",
      "keywordInMeta",
      "keywordInIntro",
    ] as const) {
      expect(status(input, id)).toBe("good");
    }
  });

  it("متای خالی ⇒ کلمه در متای خودکار (ابتدای متن) بررسی می‌شود", () => {
    expect(status(base({ metaDescription: "" }), "keywordInMeta")).toBe("good");
  });

  it("بدون کلمه‌ی کانونی ⇒ هشدار و چک‌های کلمه اجرا نمی‌شوند", () => {
    const checks = analyzeSeo(base({ focusKeyword: " " }));
    expect(checks.find((c) => c.id === "focusKeyword")?.status).toBe("warn");
    expect(checks.some((c) => c.id === "keywordInTitle")).toBe(false);
    expect(checks.some((c) => c.id === "duplicateKeyword")).toBe(false);
  });

  it("تعداد کلمات ≥ ۲۵۰", () => {
    expect(
      status(base({ text: `شارژ بوتان ${words(100)} [x](/a)` }), "wordCount"),
    ).toBe("warn");
  });

  it("تصاویر: alt، تصویر اصلی، بدون تصویر؛ دسته بدون چک تصویر", () => {
    expect(
      status(base({ images: [{ alt: " ", isPrimary: true }] }), "imageAlt"),
    ).toBe("bad");
    expect(
      status(
        base({ images: [{ alt: "a", isPrimary: false }] }),
        "primaryImage",
      ),
    ).toBe("warn");
    expect(status(base({ images: [] }), "primaryImage")).toBe("bad");
    const category = analyzeSeo(base({ images: null }));
    expect(
      category.some((c) => c.id === "imageAlt" || c.id === "primaryImage"),
    ).toBe(false);
  });

  it("alt تکراری (حتی با شماره‌ی متفاوت) ⇒ هشدار؛ altهای متفاوت سبز", () => {
    expect(
      status(
        base({
          images: [
            { alt: "شارژ بوتان الو کپسول", isPrimary: true },
            { alt: "شارژ بوتان الو کپسول ۲", isPrimary: false },
          ],
        }),
        "imageAltRepeated",
      ),
    ).toBe("warn");
    expect(
      status(
        base({
          images: [
            { alt: "شارژ بوتان روی سینی", isPrimary: true },
            { alt: "برش نزدیک کپسول با مغز گردو", isPrimary: false },
          ],
        }),
        "imageAltRepeated",
      ),
    ).toBe("good");
  });

  it("لینک داخلی ≥ ۱ (لینک خارجی حساب نمی‌شود)", () => {
    expect(
      status(
        base({ text: `شارژ بوتان ${words(260)} [x](https://a.com)` }),
        "internalLinks",
      ),
    ).toBe("warn");
  });

  it("تکراری: کلمه، عنوان و متا با نام صفحه‌ی رقیب", () => {
    const checks = analyzeSeo(
      base({
        conflicts: {
          focusKeyword: ["محصول «شارژ بوتان ویژه»"],
          seoTitle: ["دسته «کپسول»"],
          metaDescription: ["محصول «x»"],
        },
      }),
    );
    const keyword = checks.find((c) => c.id === "duplicateKeyword");
    expect(keyword?.status).toBe("bad");
    expect(keyword?.message).toContain("شارژ بوتان ویژه");
    expect(checks.find((c) => c.id === "duplicateTitle")?.status).toBe("bad");
    expect(checks.find((c) => c.id === "duplicateMeta")?.status).toBe("bad");
    // قرمزها اول
    expect(checks[0]?.status).toBe("bad");
  });

  it("conflicts نامعلوم ⇒ چک تکراری اجرا نمی‌شود", () => {
    const checks = analyzeSeo(base({ conflicts: null }));
    expect(checks.some((c) => c.id.startsWith("duplicate"))).toBe(false);
  });

  it("پر کردن کلمه: بیش از ۶ بار در ۳۰۰ کلمه", () => {
    const stuffed = `${"شارژ بوتان ".repeat(10)}${words(280)} [x](/a)`;
    expect(status(base({ text: stuffed }), "keywordDensity")).toBe("warn");
    const natural = `${"شارژ بوتان ".repeat(6)}${words(280)} [x](/a)`;
    expect(status(base({ text: natural }), "keywordDensity")).toBe("good");
  });

  it("noindex ⇒ هشدار قرمز", () => {
    expect(status(base({ noindex: true }), "noindex")).toBe("bad");
    expect(status(base(), "noindex")).toBeUndefined();
  });
});

describe("summarizeSeo", () => {
  it("قرمز > نارنجی > سبز", () => {
    expect(summarizeSeo(analyzeSeo(base({ noindex: true }))).level).toBe("bad");
    const warn = summarizeSeo(analyzeSeo(base({ name: "کپسول" })));
    expect(warn).toMatchObject({ bad: 0, warn: 1, level: "warn" });
  });
});

describe("چک شباهت متن (SEO.md §۷.۵)", () => {
  const base = {
    name: "شارژ کپسول گاز ۱۱ کیلویی",
    seoTitle: "قیمت شارژ کپسول گاز ۱۱ کیلویی",
    metaDescription: null,
    focusKeyword: null,
    text: "متن",
    images: null,
    noindex: false,
    titleSettings: {
      brandName: "الو کپسول",
      titleTemplate: "%s | {brandName}",
    },
  };
  const conflicts = (similarText?: { name: string; score: number }[]) => ({
    focusKeyword: [],
    seoTitle: [],
    metaDescription: [],
    ...(similarText ? { similarText } : {}),
  });
  const similarity = (similarText?: { name: string; score: number }[]) =>
    analyzeSeo({ ...base, conflicts: conflicts(similarText) }).find(
      (check) => check.id === "textSimilarity",
    );

  it("بالای ۶۰٪ قرمز با نام صفحه‌ی رقیب", () => {
    const check = similarity([
      { name: "محصول «الف»", score: 0.3 },
      { name: "محصول «ب»", score: 0.72 },
    ]);
    expect(check?.status).toBe("bad");
    expect(check?.message).toContain("محصول «ب»");
    expect(check?.message).toContain("تقریباً یکسان");
  });

  it("۴۰ تا ۶۰٪ نارنجی؛ کمتر سبز؛ بدون هم‌دسته سبز", () => {
    expect(similarity([{ name: "محصول «ب»", score: 0.5 }])?.status).toBe(
      "warn",
    );
    expect(similarity([{ name: "محصول «ب»", score: 0.1 }])?.status).toBe(
      "good",
    );
    expect(similarity([])?.status).toBe("good");
  });

  it("وقتی داده‌ی شباهت نیامده (دسته/فرم جدید) چک اجرا نمی‌شود", () => {
    expect(similarity(undefined)).toBeUndefined();
  });
});
