import { describe, expect, it } from "vitest";

import { isValidPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["09123456789", "09123456789"],
    ["۰۹۱۲۳۴۵۶۷۸۹", "09123456789"],
    ["٠٩١٢٣٤٥٦٧٨٩", "09123456789"],
    ["9123456789", "09123456789"],
    ["+989123456789", "09123456789"],
    ["00989123456789", "09123456789"],
    ["989123456789", "09123456789"],
    ["0912 345 6789", "09123456789"],
    ["0912-345-6789", "09123456789"],
    ["  ۰۹۱۲ ۳۴۵ ۶۷۸۹  ", "09123456789"],
    ["0912\u200c345\u200c6789", "09123456789"],
  ])("%j ⇒ %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    "",
    "abc",
    "0912345678", // یک رقم کم
    "091234567890", // یک رقم زیاد
    "02112345678", // تلفن ثابت
    "08123456789", // پیش‌شماره‌ی نامعتبر
    "+981123456789",
  ])("%j ⇒ null", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("isValidPhone", () => {
  it("بر پایه‌ی normalizePhone", () => {
    expect(isValidPhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
  });
});
