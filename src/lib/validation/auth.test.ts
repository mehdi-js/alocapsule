import { describe, expect, it } from "vitest";

import {
  newPasswordSchema,
  passwordLoginSchema,
  setPasswordSchema,
} from "./auth";

const firstError = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("قانون رمز عبور", () => {
  it("حداقل ۸ کاراکتر با حرف و عدد", () => {
    expect(newPasswordSchema.safeParse("abc12345").success).toBe(true);
    expect(newPasswordSchema.safeParse("رمزعبور1").success).toBe(true);
    expect(firstError(newPasswordSchema.safeParse("abc1234"))).toBe(
      "رمز عبور حداقل ۸ کاراکتر باشد",
    );
    expect(firstError(newPasswordSchema.safeParse("12345678"))).toBe(
      "رمز عبور باید دست‌کم یک حرف داشته باشد",
    );
    expect(firstError(newPasswordSchema.safeParse("abcdefgh"))).toBe(
      "رمز عبور باید دست‌کم یک عدد داشته باشد",
    );
    expect(newPasswordSchema.safeParse("a1".repeat(65)).success).toBe(false);
  });

  it("ارقام فارسی به لاتین تبدیل می‌شوند (همان رمز با هر صفحه‌کلید)", () => {
    expect(newPasswordSchema.parse("abcd۱۲۳۴")).toBe("abcd1234");
    expect(
      passwordLoginSchema.parse({ phone: "۰۹۱۲۱۲۳۴۵۶۷", password: "abcd۱۲۳۴" }),
    ).toEqual({ phone: "09121234567", password: "abcd1234" });
  });

  it("فاصله‌ها بخشی از رمزند و حذف نمی‌شوند", () => {
    expect(newPasswordSchema.parse(" abc 1234 ")).toBe(" abc 1234 ");
  });

  it("تکرار رمز باید یکسان باشد", () => {
    const result = setPasswordSchema.safeParse({
      password: "abc12345",
      confirmPassword: "abc12346",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(
      setPasswordSchema.safeParse({
        password: "abc12345",
        confirmPassword: "abc۱۲۳۴۵",
      }).success,
    ).toBe(true);
  });

  it("ورود: رمز خالی پذیرفته نمی‌شود ولی قانون رمز جدید اعمال نمی‌شود", () => {
    expect(
      passwordLoginSchema.safeParse({ phone: "09121234567", password: "" })
        .success,
    ).toBe(false);
    expect(
      passwordLoginSchema.safeParse({ phone: "09121234567", password: "old" })
        .success,
    ).toBe(true);
  });
});
