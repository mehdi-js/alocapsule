import { describe, expect, it } from "vitest";

import {
  businessHoursOnlyMessage,
  isWithinBusinessHours,
  tehranHourFraction,
} from "./business-hours";

/** تهران UTC+3:30 (بدون ساعت تابستانی از ۱۴۰۱) */
const at = (iso: string) => new Date(iso);

describe("ساعات کاری به وقت تهران", () => {
  it("ساعت به وقت تهران محاسبه می‌شود نه UTC", () => {
    expect(tehranHourFraction(at("2026-10-01T05:30:00Z"))).toBe(9);
    expect(tehranHourFraction(at("2026-10-01T20:30:00Z"))).toBeCloseTo(0, 5);
  });

  it("بازه‌ی نیمه‌باز ۹ تا ۱۸", () => {
    expect(isWithinBusinessHours(at("2026-10-01T05:29:00Z"), 9, 18)).toBe(
      false,
    );
    expect(isWithinBusinessHours(at("2026-10-01T05:30:00Z"), 9, 18)).toBe(true);
    expect(isWithinBusinessHours(at("2026-10-01T14:29:00Z"), 9, 18)).toBe(true);
    expect(isWithinBusinessHours(at("2026-10-01T14:30:00Z"), 9, 18)).toBe(
      false,
    );
  });

  it("پیام فارسی با ساعت‌ها", () => {
    expect(businessHoursOnlyMessage("ارسال فوری", 9, 18)).toBe(
      "ارسال فوری فقط در ساعات کاری (۹ تا ۱۸) قابل انتخاب است.",
    );
  });
});
