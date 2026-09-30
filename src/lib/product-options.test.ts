import { describe, expect, it } from "vitest";

import {
  buildOptionKey,
  buildVariantTitle,
  computeFilledPrices,
  DEFAULT_OPTION_KEY,
  DIFFERENT_CHARGE_PRICES_MESSAGE,
  generateCombinations,
  isLegacyKey,
  missingCombinations,
  NO_CHARGE_PRICE_MESSAGE,
  type OptionDef,
  parseOptionKey,
  resolveVariantKeys,
  suggestChargePrice,
  validateOptionDefinitions,
} from "./product-options";

const valve: OptionDef = {
  code: "valve",
  name: "نوع شیر",
  values: [
    { code: "persi", label: "پرسی" },
    { code: "butane", label: "بوتان" },
  ],
};
const fill: OptionDef = {
  code: "fill",
  name: "وضعیت تحویل",
  values: [
    { code: "empty", label: "خالی" },
    { code: "filled", label: "پرشده" },
  ],
};
const size: OptionDef = {
  code: "size",
  name: "اندازه",
  values: ["11", "25", "33", "50"].map((code) => ({
    code,
    label: `${code} کیلویی`,
  })),
};

describe("optionKey و عنوان ترکیب", () => {
  it("کلید بر اساس کد گروه مرتب می‌شود و بدون گروه default است", () => {
    expect(buildOptionKey({ valve: "persi", fill: "filled" })).toBe(
      "fill:filled|valve:persi",
    );
    expect(buildOptionKey({ fill: "filled", valve: "persi" })).toBe(
      "fill:filled|valve:persi",
    );
    expect(buildOptionKey({})).toBe(DEFAULT_OPTION_KEY);
  });

  it("کلید ⇄ انتخاب؛ default و legacy گزینه ندارند", () => {
    expect(parseOptionKey("fill:filled|valve:persi")).toEqual({
      fill: "filled",
      valve: "persi",
    });
    expect(parseOptionKey("default")).toEqual({});
    expect(parseOptionKey("legacy:11000")).toEqual({});
    expect(isLegacyKey("legacy:11000")).toBe(true);
    expect(isLegacyKey("fill:empty")).toBe(false);
  });

  it("عنوان خودکار: «پرسی · پرشده» به ترتیب گروه‌ها (نه ترتیب کلید)", () => {
    expect(
      buildVariantTitle([valve, fill], { fill: "filled", valve: "persi" }),
    ).toBe("پرسی · پرشده");
    expect(
      buildVariantTitle([fill, valve], { fill: "filled", valve: "persi" }),
    ).toBe("پرشده · پرسی");
    expect(buildVariantTitle([valve], { valve: "butane" })).toBe("بوتان");
    expect(buildVariantTitle([], {})).toBe("");
  });
});

describe("ترکیب‌ها", () => {
  it("ضرب دکارتی: شارژ ۲، دست دوم ۸ ترکیب", () => {
    expect(generateCombinations([valve])).toHaveLength(2);
    expect(generateCombinations([size, fill])).toHaveLength(8);
    expect(generateCombinations([])).toEqual([]);
  });

  it("مقدار غیرفعال در ترکیب‌های جدید نمی‌آید", () => {
    const partial: OptionDef = {
      ...fill,
      values: [
        { code: "empty", label: "خالی" },
        { code: "filled", label: "پرشده", isActive: false },
      ],
    };
    expect(generateCombinations([partial])).toEqual([{ fill: "empty" }]);
  });

  it("«ساخت همه‌ی ترکیب‌ها» ترکیب موجود را دوباره نمی‌سازد (بدون تکرار)", () => {
    const existing = ["valve:persi"];
    const missing = missingCombinations([valve], existing);
    expect(missing).toEqual([{ valve: "butane" }]);
    // بار دوم با همه‌ی کلیدها ⇒ چیزی نمی‌ماند
    expect(
      missingCombinations([valve], ["valve:persi", "valve:butane"]),
    ).toEqual([]);
    // کلید موجود با گروه‌های مرتب‌نشده هم تشخیص داده می‌شود
    expect(
      missingCombinations([valve, fill], ["fill:empty|valve:persi"]),
    ).toHaveLength(3);
  });
});

describe("validateOptionDefinitions", () => {
  it("معتبر", () => {
    expect(validateOptionDefinitions([valve, fill])).toEqual([]);
  });

  it("کد نامعتبر، تکراری و گروه بدون مقدار", () => {
    const issues = validateOptionDefinitions([
      { code: "Bad Code", name: "الف", values: [{ code: "a:b", label: "x" }] },
      { code: "valve", name: "ب", values: [] },
      {
        code: "valve",
        name: "ج",
        values: [
          { code: "a", label: "x" },
          { code: "a", label: "x" },
        ],
      },
    ]);
    const paths = issues.map((i) => i.path);
    expect(paths).toContain("options.0.code");
    expect(paths).toContain("options.0.values.0.code");
    expect(paths).toContain("options.1.values");
    expect(paths).toContain("options.2.code");
    expect(paths).toContain("options.2.values.1.code");
    expect(paths).toContain("options.2.values.1.label");
  });

  it("حداکثر ۳ گروه", () => {
    const groups = ["a", "b", "c", "d"].map((code) => ({
      code,
      name: code.toUpperCase() + "x",
      values: [{ code: "v", label: "v" }],
    }));
    expect(validateOptionDefinitions(groups).map((i) => i.path)).toContain(
      "options",
    );
  });
});

describe("resolveVariantKeys", () => {
  const empty = new Map<string, string>();

  it("محصول دارای گزینه: کلید هر ترکیب و یکتایی", () => {
    const ok = resolveVariantKeys(
      [valve],
      [{ selection: { valve: "persi" } }, { selection: { valve: "butane" } }],
      empty,
    );
    expect(ok).toEqual({ ok: true, keys: ["valve:persi", "valve:butane"] });

    const dup = resolveVariantKeys(
      [valve],
      [{ selection: { valve: "persi" } }, { selection: { valve: "persi" } }],
      empty,
    );
    expect(dup.ok).toBe(false);
  });

  it("مقدار ناقص/ناشناخته و گروه اضافه ⇒ خطا با مسیر ردیف", () => {
    const result = resolveVariantKeys(
      [valve],
      [
        { selection: {} },
        { selection: { valve: "xyz" } },
        { selection: { valve: "persi", fill: "empty" } },
      ],
      empty,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((i) => i.path)).toEqual([
        "variants.0.selection",
        "variants.1.selection",
        "variants.2.selection",
      ]);
    }
  });

  it("محصول بدون گزینه: دقیقاً یک ترکیب default", () => {
    expect(resolveVariantKeys([], [{ selection: {} }], empty)).toEqual({
      ok: true,
      keys: ["default"],
    });
    const two = resolveVariantKeys(
      [],
      [{ selection: {} }, { selection: {} }],
      empty,
    );
    expect(two.ok).toBe(false);
    expect(resolveVariantKeys([], [], empty).ok).toBe(false);
  });

  it("چند ترکیب قدیمی بدون گزینه با همان شناسه و کلید باقی می‌مانند", () => {
    const existing = new Map([
      ["a", "legacy:11000"],
      ["b", "legacy:25000"],
    ]);
    expect(
      resolveVariantKeys(
        [],
        [
          { id: "a", selection: {} },
          { id: "b", selection: {} },
        ],
        existing,
      ),
    ).toEqual({ ok: true, keys: ["legacy:11000", "legacy:25000"] });
    // ترکیب قدیمیِ جدید (بدون شناسه) مجاز نیست
    expect(
      resolveVariantKeys(
        [],
        [{ id: "a", selection: {} }, { selection: {} }],
        existing,
      ).ok,
    ).toBe(false);
  });
});

describe("محاسبه‌ی قیمت پرشده", () => {
  it("قیمت شارژ یکسان ⇒ پیشنهاد؛ خرید ۱۱: ۶٬۰۰۰٬۰۰۰ + ۸۰۰٬۰۰۰ = ۶٬۸۰۰٬۰۰۰", () => {
    const result = computeFilledPrices(
      [
        { selection: { fill: "empty" }, price: 6_000_000 },
        { selection: { fill: "filled" }, price: null },
      ],
      [800_000, 800_000],
    );
    expect(result).toEqual({
      kind: "ok",
      prices: [{ selection: { fill: "filled" }, price: 6_800_000 }],
    });
  });

  it("قیمت شارژ پرسی و بوتان متفاوت ⇒ هشدار و پر نمی‌کند", () => {
    expect(
      computeFilledPrices(
        [{ selection: { fill: "empty" }, price: 6_000_000 }],
        [800_000, 850_000],
      ),
    ).toEqual({ kind: "warn", message: DIFFERENT_CHARGE_PRICES_MESSAGE });
    expect(suggestChargePrice([])).toEqual({
      kind: "warn",
      message: NO_CHARGE_PRICE_MESSAGE,
    });
  });

  it("قیمت خالی وارد نشده ⇒ هشدار؛ بقیه‌ی گزینه‌ها با هم تطبیق داده می‌شوند", () => {
    expect(
      computeFilledPrices(
        [{ selection: { fill: "empty" }, price: null }],
        [800_000],
      ).kind,
    ).toBe("warn");
    const multi = computeFilledPrices(
      [
        { selection: { fill: "empty", size: "11" }, price: 1_000 },
        { selection: { fill: "filled", size: "11" }, price: null },
        { selection: { fill: "empty", size: "25" }, price: 2_000 },
        { selection: { fill: "filled", size: "25" }, price: null },
      ],
      [500],
    );
    expect(multi).toEqual({
      kind: "ok",
      prices: [
        { selection: { fill: "filled", size: "11" }, price: 1_500 },
        { selection: { fill: "filled", size: "25" }, price: 2_500 },
      ],
    });
  });
});
