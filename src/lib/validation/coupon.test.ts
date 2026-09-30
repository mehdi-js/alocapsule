import { describe, expect, it } from "vitest";

import {
  type CouponFormInput,
  couponInputSchema,
} from "@/lib/validation/coupon";

const base: CouponFormInput = {
  code: " welcome ۱۰ ",
  title: "خوش‌آمد",
  type: "PERCENT",
  value: 10,
  maxDiscountAmount: 100_000,
  minOrderAmount: null,
  scope: "ALL",
  categoryIds: [],
  productIds: [],
  usageLimitTotal: null,
  usageLimitPerUser: 1,
  firstOrderOnly: true,
  startsAt: "",
  expiresAt: "۱۴۰۵/۱۲/۲۹",
  isActive: true,
};

function errors(input: Partial<CouponFormInput>): Record<string, string> {
  const result = couponInputSchema.safeParse({ ...base, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

describe("couponInputSchema", () => {
  it("نرمال‌سازی کد و تبدیل تاریخ‌ها", () => {
    const parsed = couponInputSchema.parse(base);
    expect(parsed.code).toBe("WELCOME10");
    expect(parsed.startsAt).toBeNull();
    // پایان روز ۲۹ اسفند ۱۴۰۵ به وقت تهران
    expect(parsed.expiresAt?.toISOString()).toBe("2027-03-20T20:29:59.999Z");
  });

  it("درصد خارج از ۱ تا ۱۰۰ رد می‌شود", () => {
    expect(errors({ value: 0 }).value).toBe(
      "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد",
    );
    expect(errors({ value: 101 }).value).toBeDefined();
  });

  it("ارسال رایگان: مقدار و سقف پاک می‌شوند", () => {
    const parsed = couponInputSchema.parse({
      ...base,
      type: "FREE_SHIPPING",
      value: 50,
    });
    expect(parsed.value).toBe(0);
    expect(parsed.maxDiscountAmount).toBeNull();
  });

  it("مبلغ ثابت: سقف درصدی معنا ندارد", () => {
    const parsed = couponInputSchema.parse({
      ...base,
      type: "FIXED",
      value: 50_000,
    });
    expect(parsed.maxDiscountAmount).toBeNull();
  });

  it("دامنه بدون انتخاب رد می‌شود و انتخاب‌های بی‌ربط پاک می‌شوند", () => {
    expect(errors({ scope: "CATEGORY" }).categoryIds).toBeDefined();
    expect(errors({ scope: "PRODUCT" }).productIds).toBeDefined();
    const parsed = couponInputSchema.parse({
      ...base,
      categoryIds: ["c1"],
      productIds: ["p1"],
    });
    expect(parsed.categoryIds).toEqual([]);
    expect(parsed.productIds).toEqual([]);
  });

  it("تاریخ نامعتبر و بازه‌ی وارونه", () => {
    expect(errors({ startsAt: "1405/13/01" }).startsAt).toContain("نامعتبر");
    expect(
      errors({ startsAt: "1405/08/01", expiresAt: "1405/07/01" }).expiresAt,
    ).toBe("تاریخ پایان نباید قبل از تاریخ شروع باشد");
    // یک روزه مجاز است
    expect(errors({ startsAt: "1405/07/01", expiresAt: "1405/07/01" })).toEqual(
      {},
    );
  });

  it("کد نامعتبر", () => {
    expect(errors({ code: "تخفیف" }).code).toBeDefined();
    expect(errors({ code: "ab" }).code).toBeDefined();
  });

  it("سقف‌های صفر یا منفی رد می‌شوند", () => {
    expect(errors({ usageLimitTotal: 0 }).usageLimitTotal).toBeDefined();
    expect(errors({ minOrderAmount: -5 }).minOrderAmount).toBeDefined();
  });
});
