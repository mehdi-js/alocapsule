import { describe, expect, it } from "vitest";

import {
  cn,
  parseIntegerInput,
  toLatinDigits,
  toPersianDigits,
} from "@/lib/utils";

describe("toPersianDigits", () => {
  it("ارقام لاتین را فارسی می‌کند و بقیه‌ی کاراکترها را حفظ می‌کند", () => {
    expect(toPersianDigits(1234567890)).toBe("۱۲۳۴۵۶۷۸۹۰");
    expect(toPersianDigits("AC-14040625-0031")).toBe("AC-۱۴۰۴۰۶۲۵-۰۰۳۱");
    expect(toPersianDigits("۱۲۳")).toBe("۱۲۳");
  });
});

describe("toLatinDigits", () => {
  it("ارقام فارسی و عربی را لاتین می‌کند", () => {
    expect(toLatinDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toLatinDigits("کد ۱۲ab٣")).toBe("کد 12ab3");
  });
});

describe("cn", () => {
  it("مقادیر falsy را حذف می‌کند", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
    expect(cn()).toBe("");
  });
});

describe("parseIntegerInput", () => {
  it("ارقام فارسی و جداکننده‌ها را می‌پذیرد", () => {
    expect(parseIntegerInput("۱۲۰٬۰۰۰")).toBe(120000);
    expect(parseIntegerInput("1,500,000")).toBe(1500000);
    expect(parseIntegerInput(" ۵۰۰ ")).toBe(500);
    expect(parseIntegerInput("0")).toBe(0);
  });

  it("خالی، اعشاری و منفی ⇒ null", () => {
    for (const value of ["", "  ", "12.5", "-3", "abc", "12a"]) {
      expect(parseIntegerInput(value)).toBeNull();
    }
  });
});
