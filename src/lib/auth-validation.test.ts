import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/safe-redirect";
import { requestOtpSchema, verifyOtpSchema } from "@/lib/validation/auth";

describe("requestOtpSchema", () => {
  it("شماره را نرمال می‌کند", () => {
    expect(requestOtpSchema.parse({ phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹" })).toEqual({
      phone: "09123456789",
    });
    expect(requestOtpSchema.parse({ phone: "+989123456789" }).phone).toBe(
      "09123456789",
    );
  });

  it("شماره‌ی نامعتبر پیام فارسی می‌دهد", () => {
    const result = requestOtpSchema.safeParse({ phone: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "شماره‌ی موبایل نامعتبر است",
      );
    }
  });
});

describe("verifyOtpSchema", () => {
  it("ارقام فارسی کد را به لاتین تبدیل می‌کند", () => {
    expect(
      verifyOtpSchema.parse({ phone: "09123456789", code: "۱۲۳ ۴۵۶" }).code,
    ).toBe("123456");
  });

  it.each(["12345", "1234567", "abcdef", ""])("کد %j رد می‌شود", (code) => {
    expect(
      verifyOtpSchema.safeParse({ phone: "09123456789", code }).success,
    ).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("مسیر داخلی را می‌پذیرد", () => {
    expect(safeRedirectPath("/admin/products?page=2")).toBe(
      "/admin/products?page=2",
    );
    expect(safeRedirectPath("/account")).toBe("/account");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil",
    "/ x",
    "",
    null,
    undefined,
  ])("%j ⇒ fallback", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
