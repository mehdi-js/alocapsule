import { describe, expect, it } from "vitest";

import {
  capMessage,
  clampQuantity,
  mergeQuantities,
  removedItemMessage,
} from "@/lib/cart-math";

describe("clampQuantity", () => {
  it("زیر سقف دست‌نخورده می‌ماند", () => {
    expect(clampQuantity(3, 99)).toEqual({ quantity: 3, capped: false });
    expect(clampQuantity(99, 99)).toEqual({ quantity: 99, capped: false });
  });

  it("بیش از سقف به سقف اصلاح می‌شود", () => {
    expect(clampQuantity(100, 99)).toEqual({ quantity: 99, capped: true });
    expect(clampQuantity(5000, 20)).toEqual({ quantity: 20, capped: true });
  });

  it("مقدار نامعتبر به ۱ برمی‌گردد", () => {
    for (const value of [0, -3, 1.5, Number.NaN]) {
      expect(clampQuantity(value, 99)).toEqual({ quantity: 1, capped: false });
    }
  });
});

describe("mergeQuantities", () => {
  it("جمع دو سبد با اعمال سقف", () => {
    expect(mergeQuantities(2, 3, 99)).toEqual({ quantity: 5, capped: false });
    expect(mergeQuantities(60, 50, 99)).toEqual({ quantity: 99, capped: true });
  });
});

describe("پیام‌ها", () => {
  it("فارسی و با ارقام فارسی", () => {
    expect(capMessage(99)).toContain("۹۹");
    expect(removedItemMessage("قطاب — ۵۰۰ گرم")).toBe(
      "«قطاب — ۵۰۰ گرم» دیگر قابل سفارش نیست و از سبد شما حذف شد.",
    );
  });
});
