import { describe, expect, it } from "vitest";

import {
  burnPasswordCheck,
  hashPassword,
  verifyPassword,
} from "./password-hash";

describe("هش رمز عبور (scrypt)", () => {
  it("رمز درست پذیرفته و رمز غلط رد می‌شود", async () => {
    const hash = await hashPassword("AloCapsule1405");
    expect(await verifyPassword("AloCapsule1405", hash)).toBe(true);
    expect(await verifyPassword("alocapsule1405", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("پارامترها و salt در رشته ذخیره می‌شوند و رمز خام دیده نمی‌شود", async () => {
    const a = await hashPassword("AloCapsule1405");
    const b = await hashPassword("AloCapsule1405");
    expect(a).toMatch(
      /^scrypt\$32768\$8\$3\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/,
    );
    expect(a).not.toBe(b);
    expect(a).not.toContain("AloCapsule1405");
  });

  it("حروف فارسی با شکل‌های یونیکد متفاوت (NFC) یکی حساب می‌شوند", async () => {
    const composed = "رمزآ1234"; // «آ» ترکیبی
    const decomposed = "رمزآ1234"; // «ا» + مد
    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
  });

  it("رشته‌ی خراب یا طرح ناشناخته ⇒ false (بدون خطا)", async () => {
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
    const hash = await hashPassword("AloCapsule1405");
    const tampered = hash.slice(0, -4) + "AAAA";
    expect(await verifyPassword("AloCapsule1405", tampered)).toBe(false);
  });

  it("burnPasswordCheck بدون خطا اجرا می‌شود", async () => {
    await expect(burnPasswordCheck("anything1")).resolves.toBeUndefined();
  });
});
