import { describe, expect, it } from "vitest";

import {
  calculateGrandTotal,
  formatToman,
  formatTomanWithUnit,
  isValidToman,
} from "@/lib/money";

describe("formatToman", () => {
  it("با جداکننده‌ی هزارگان (کاما) و ارقام فارسی", () => {
    expect(formatToman(0)).toBe("۰");
    expect(formatToman(999)).toBe("۹۹۹");
    expect(formatToman(1000)).toBe("۱,۰۰۰");
    expect(formatToman(1_500_000)).toBe("۱,۵۰۰,۰۰۰");
  });

  it("با واحد تومان", () => {
    expect(formatTomanWithUnit(250_000)).toBe("۲۵۰,۰۰۰ تومان");
  });

  it("مقدار اعشاری یا منفی را نمی‌پذیرد", () => {
    expect(() => formatToman(10.5)).toThrow(RangeError);
    expect(() => formatToman(-1)).toThrow(RangeError);
    expect(() => formatToman(Number.NaN)).toThrow(RangeError);
  });
});

describe("isValidToman", () => {
  it("فقط عدد صحیح غیرمنفی", () => {
    expect(isValidToman(0)).toBe(true);
    expect(isValidToman(120_000)).toBe(true);
    expect(isValidToman(1.5)).toBe(false);
    expect(isValidToman(-5)).toBe(false);
    expect(isValidToman(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("calculateGrandTotal", () => {
  it("grandTotal = subtotal + shippingTotal − discountTotal", () => {
    expect(calculateGrandTotal(1_000_000, 80_000, 100_000)).toBe(980_000);
    expect(calculateGrandTotal(500_000, 0, 0)).toBe(500_000);
  });

  it("تخفیف تا سقف subtotal + shippingTotal مجاز است", () => {
    expect(calculateGrandTotal(500_000, 80_000, 580_000)).toBe(0);
  });

  it("تخفیف بیشتر از subtotal + shippingTotal خطا می‌دهد", () => {
    expect(() => calculateGrandTotal(500_000, 80_000, 580_001)).toThrow(
      RangeError,
    );
  });

  it("مقدار منفی یا اعشاری خطا می‌دهد", () => {
    expect(() => calculateGrandTotal(-1, 0, 0)).toThrow(RangeError);
    expect(() => calculateGrandTotal(100, 0, -1)).toThrow(RangeError);
    expect(() => calculateGrandTotal(100.5, 0, 0)).toThrow(RangeError);
  });
});
