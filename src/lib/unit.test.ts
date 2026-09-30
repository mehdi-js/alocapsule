import { describe, expect, it } from "vitest";

import {
  calculatePricePerKg,
  getVariantTitle,
  type ProductUnit,
  resolveVariantTitle,
  suggestShippingWeightGrams,
} from "@/lib/unit";

describe("getVariantTitle — جدول بخش ۶.۱", () => {
  const cases: Array<[ProductUnit, number, string]> = [
    ["GRAM", 250, "۲۵۰ گرم"],
    ["GRAM", 500, "۵۰۰ گرم"],
    ["GRAM", 1000, "۱ کیلوگرم"],
    ["GRAM", 1500, "۱.۵ کیلوگرم"],
    ["PIECE", 1, "۱ عددی"],
    ["PIECE", 12, "۱۲ عددی"],
  ];

  it.each(cases)("%s %i ⇒ %s", (unit, unitValue, expected) => {
    expect(getVariantTitle(unit, unitValue)).toBe(expected);
  });

  it("مقادیر کیلوگرمی دیگر را درست تولید می‌کند", () => {
    expect(getVariantTitle("GRAM", 2000)).toBe("۲ کیلوگرم");
    expect(getVariantTitle("GRAM", 1250)).toBe("۱.۲۵ کیلوگرم");
    expect(getVariantTitle("GRAM", 750)).toBe("۷۵۰ گرم");
  });

  it("مقدار نامعتبر خطا می‌دهد", () => {
    expect(() => getVariantTitle("GRAM", 0)).toThrow(RangeError);
    expect(() => getVariantTitle("GRAM", -500)).toThrow(RangeError);
    expect(() => getVariantTitle("PIECE", 1.5)).toThrow(RangeError);
  });
});

describe("resolveVariantTitle", () => {
  it("بدون عنوان دستی، عنوان خودکار برمی‌گرداند", () => {
    expect(resolveVariantTitle("GRAM", 500)).toBe("۵۰۰ گرم");
    expect(resolveVariantTitle("GRAM", 500, "")).toBe("۵۰۰ گرم");
    expect(resolveVariantTitle("GRAM", 500, "   ")).toBe("۵۰۰ گرم");
    expect(resolveVariantTitle("GRAM", 500, null)).toBe("۵۰۰ گرم");
  });

  it("عنوان دستی ادمین اولویت دارد", () => {
    expect(resolveVariantTitle("PIECE", 12, " جعبه‌ی هدیه ")).toBe(
      "جعبه‌ی هدیه",
    );
  });
});

describe("calculatePricePerKg", () => {
  it("round(price / unitValue × 1000) برای محصول گرمی", () => {
    expect(calculatePricePerKg("GRAM", 250_000, 500)).toBe(500_000);
    expect(calculatePricePerKg("GRAM", 480_000, 1000)).toBe(480_000);
    expect(calculatePricePerKg("GRAM", 700_000, 1500)).toBe(466_667);
    expect(calculatePricePerKg("GRAM", 130_000, 250)).toBe(520_000);
  });

  it("برای محصول عددی null برمی‌گرداند", () => {
    expect(calculatePricePerKg("PIECE", 300_000, 12)).toBeNull();
  });

  it("ورودی نامعتبر خطا می‌دهد", () => {
    expect(() => calculatePricePerKg("GRAM", 100, 0)).toThrow(RangeError);
    expect(() => calculatePricePerKg("GRAM", -1, 500)).toThrow(RangeError);
    expect(() => calculatePricePerKg("GRAM", 10.5, 500)).toThrow(RangeError);
  });
});

describe("suggestShippingWeightGrams", () => {
  it("برای GRAM برابر unitValue + وزن بسته‌بندی است", () => {
    expect(suggestShippingWeightGrams("GRAM", 500, 200)).toBe(700);
    expect(suggestShippingWeightGrams("GRAM", 1000, 150)).toBe(1150);
  });

  it("برای PIECE پیشنهادی ندارد", () => {
    expect(suggestShippingWeightGrams("PIECE", 4, 200)).toBeNull();
  });
});
