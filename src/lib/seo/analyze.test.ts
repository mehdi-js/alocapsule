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
    name: "باقلوا گردویی",
    seoTitle: "خرید باقلوا گردویی اصل و تازه",
    metaDescription:
      "باقلوا گردویی علی حان با مغز گردوی تازه و شربت متعادل؛ طعمی اصیل و خوش‌عطر برای پذیرایی و هدیه. همین حالا آنلاین سفارش دهید.",
    focusKeyword: "باقلوا گردویی",
    text: `باقلوا گردویی ${words(260)} [باقلوا](/category/baklava)`,
    images: [{ alt: "باقلوا گردویی علی حان", isPrimary: true }],
    noindex: false,
    titleSettings: { brandName: "علی حان", titleTemplate: "%s | {brandName}" },
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
    // «سوتلاوا | علی حان» = ۱۷ کاراکتر
    expect(status(base({ seoTitle: "سوتلاوا" }), "titleLength")).toBe("warn");
    expect(status(base({ seoTitle: "خ".repeat(60) }), "titleLength")).toBe(
      "warn",
    );
    const message = analyzeSeo(base()).find(
      (c) => c.id === "titleLength",
    )?.message;
    // «خرید باقلوا گردویی اصل و تازه | علی حان» = ۳۹ کاراکتر
    expect(message).toContain("۳۹");
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
      status(
        base({ seoTitle: "خرید شیرینی ترکی اصل و تازه" }),
        "keywordInTitle",
      ),
    ).toBe("bad");
    expect(status(base({ name: "باقلوا" }), "keywordInH1")).toBe("warn");
    expect(
      status(
        base({ metaDescription: `${"متن ".repeat(30)}بدون کلمه` }),
        "keywordInMeta",
      ),
    ).toBe("warn");
    expect(
      status(
        base({ text: `${words(150)} باقلوا گردویی ${words(150)}` }),
        "keywordInIntro",
      ),
    ).toBe("warn");
  });

  it("نیم‌فاصله و ي عربی مانع تطبیق نمی‌شود", () => {
    const input = base({
      name: "باقلوا پسته‌ای",
      seoTitle: "خرید باقلوا پسته‌ای اصل",
      focusKeyword: "باقلوا پسته اي",
      metaDescription: `باقلوا پسته‌ای ${"متن ".repeat(28)}`,
      text: `باقلوا پسته‌ای ${words(260)} [x](/a)`,
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
      status(
        base({ text: `باقلوا گردویی ${words(100)} [x](/a)` }),
        "wordCount",
      ),
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
            { alt: "باقلوا گردویی علی حان", isPrimary: true },
            { alt: "باقلوا گردویی علی حان ۲", isPrimary: false },
          ],
        }),
        "imageAltRepeated",
      ),
    ).toBe("warn");
    expect(
      status(
        base({
          images: [
            { alt: "باقلوا گردویی روی سینی", isPrimary: true },
            { alt: "برش نزدیک باقلوا با مغز گردو", isPrimary: false },
          ],
        }),
        "imageAltRepeated",
      ),
    ).toBe("good");
  });

  it("لینک داخلی ≥ ۱ (لینک خارجی حساب نمی‌شود)", () => {
    expect(
      status(
        base({ text: `باقلوا گردویی ${words(260)} [x](https://a.com)` }),
        "internalLinks",
      ),
    ).toBe("warn");
  });

  it("تکراری: کلمه، عنوان و متا با نام صفحه‌ی رقیب", () => {
    const checks = analyzeSeo(
      base({
        conflicts: {
          focusKeyword: ["محصول «باقلوا گردویی ویژه»"],
          seoTitle: ["دسته «باقلوا»"],
          metaDescription: ["محصول «x»"],
        },
      }),
    );
    const keyword = checks.find((c) => c.id === "duplicateKeyword");
    expect(keyword?.status).toBe("bad");
    expect(keyword?.message).toContain("باقلوا گردویی ویژه");
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
    const stuffed = `${"باقلوا گردویی ".repeat(10)}${words(280)} [x](/a)`;
    expect(status(base({ text: stuffed }), "keywordDensity")).toBe("warn");
    const natural = `${"باقلوا گردویی ".repeat(6)}${words(280)} [x](/a)`;
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
    const warn = summarizeSeo(analyzeSeo(base({ name: "باقلوا" })));
    expect(warn).toMatchObject({ bad: 0, warn: 1, level: "warn" });
  });
});
