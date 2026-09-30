import { describe, expect, it } from "vitest";

import {
  calculateDiscount,
  type CouponContext,
  type CouponRule,
  describeCoupon,
  generateCouponCode,
  isValidCouponCode,
  normalizeCouponCode,
  validateCoupon,
} from "@/lib/coupon";

const NOW = new Date("2026-09-24T10:00:00Z");

function rule(overrides: Partial<CouponRule> = {}): CouponRule {
  return {
    type: "PERCENT",
    value: 10,
    maxDiscountAmount: null,
    minOrderAmount: null,
    scope: "ALL",
    usageLimitTotal: null,
    usageLimitPerUser: null,
    usedCount: 0,
    firstOrderOnly: false,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    categoryIds: [],
    productIds: [],
    ...overrides,
  };
}

const lines = [
  { productId: "p-baklava", categoryId: "c-baklava", lineTotal: 520_000 },
  { productId: "p-qotab", categoryId: "c-sweets", lineTotal: 220_000 },
];

function ctx(overrides: Partial<CouponContext> = {}): CouponContext {
  return {
    now: NOW,
    lines,
    userUsageCount: 0,
    userHasPaidOrder: false,
    ...overrides,
  };
}

describe("normalizeCouponCode", () => {
  it.each([
    ["welcome10", "WELCOME10"],
    [" Welcome 10 ", "WELCOME10"],
    ["WELCOME۱۰", "WELCOME10"],
    ["welcome٣", "WELCOME3"],
    ["free\u200cship", "FREESHIP"],
  ])("%j ⇒ %s", (input, expected) => {
    expect(normalizeCouponCode(input)).toBe(expected);
  });

  it("فرمت مجاز", () => {
    expect(isValidCouponCode("WELCOME10")).toBe(true);
    expect(isValidCouponCode("SUMMER-2026_A")).toBe(true);
    expect(isValidCouponCode("AB")).toBe(false);
    expect(isValidCouponCode("تخفیف")).toBe(false);
    expect(isValidCouponCode("A".repeat(33))).toBe(false);
  });
});

describe("generateCouponCode", () => {
  it("۸ کاراکتر بدون حروف مبهم و معتبر", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCouponCode();
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code).not.toMatch(/[01OIL]/);
      expect(isValidCouponCode(code)).toBe(true);
    }
  });
});

describe("calculateDiscount — سه نوع کد", () => {
  it("درصدی: به پایین تا ۱۰۰۰ تومان گرد می‌شود", () => {
    // ۱۵٪ از ۱۳۵,۵۵۰ = ۲۰,۳۳۲.۵ ⇒ ۲۰,۰۰۰
    expect(
      calculateDiscount(rule({ value: 15 }), 135_550, 135_550, null).amount,
    ).toBe(20_000);
    // ۱۰٪ از ۷۴۰,۰۰۰ = ۷۴,۰۰۰
    expect(calculateDiscount(rule(), 740_000, 740_000, null).amount).toBe(
      74_000,
    );
  });

  it("درصدی: سقف تخفیف اعمال می‌شود", () => {
    const capped = rule({ value: 20, maxDiscountAmount: 100_000 });
    expect(calculateDiscount(capped, 740_000, 740_000, null).amount).toBe(
      100_000,
    );
    // زیر سقف، خود درصد
    expect(calculateDiscount(capped, 300_000, 300_000, null).amount).toBe(
      60_000,
    );
  });

  it("مبلغ ثابت: هرگز بیشتر از جمع اقلام مشمول", () => {
    const fixed = rule({ type: "FIXED", value: 150_000 });
    expect(calculateDiscount(fixed, 520_000, 740_000, null).amount).toBe(
      150_000,
    );
    expect(calculateDiscount(fixed, 90_000, 740_000, null).amount).toBe(90_000);
  });

  it("ارسال رایگان: برابر هزینه‌ی ارسال؛ قبل از انتخاب ارسال صفر", () => {
    const free = rule({ type: "FREE_SHIPPING", value: 0 });
    expect(calculateDiscount(free, 740_000, 740_000, 90_000)).toEqual({
      amount: 90_000,
      freeShipping: true,
    });
    expect(calculateDiscount(free, 740_000, 740_000, null)).toEqual({
      amount: 0,
      freeShipping: true,
    });
  });

  it("تخفیف هرگز از subtotal + shipping بیشتر و هرگز منفی نمی‌شود", () => {
    const huge = rule({ type: "FIXED", value: 10_000_000 });
    expect(calculateDiscount(huge, 740_000, 740_000, 90_000).amount).toBe(
      740_000,
    );
    const hundred = rule({ value: 100 });
    expect(calculateDiscount(hundred, 740_000, 740_000, 0).amount).toBe(
      740_000,
    );
    expect(calculateDiscount(rule(), 0, 0, 0).amount).toBe(0);
  });
});

describe("validateCoupon — پیام‌های متفاوت", () => {
  it("کد ناموجود یا غیرفعال", () => {
    expect(validateCoupon(null, ctx())).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
    expect(validateCoupon(rule({ isActive: false }), ctx())).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("قبل از شروع و منقضی", () => {
    const future = rule({ startsAt: new Date("2026-10-01T00:00:00Z") });
    const past = rule({ expiresAt: new Date("2026-09-01T00:00:00Z") });
    const a = validateCoupon(future, ctx());
    const b = validateCoupon(past, ctx());
    expect(a).toMatchObject({ ok: false, code: "NOT_STARTED" });
    expect(b).toMatchObject({ ok: false, code: "EXPIRED" });
    if (!a.ok && !b.ok) expect(a.message).not.toBe(b.message);
  });

  it("زیر حداقل سبد: پیام شامل هر دو مبلغ", () => {
    const result = validateCoupon(rule({ minOrderAmount: 1_000_000 }), ctx());
    expect(result).toMatchObject({ ok: false, code: "MIN_ORDER" });
    if (!result.ok) {
      expect(result.message).toContain("۱,۰۰۰,۰۰۰");
      expect(result.message).toContain("۷۴۰,۰۰۰");
    }
  });

  it("سقف کل و سقف هر کاربر", () => {
    expect(
      validateCoupon(rule({ usageLimitTotal: 5, usedCount: 5 }), ctx()),
    ).toMatchObject({
      code: "TOTAL_LIMIT",
    });
    expect(
      validateCoupon(
        rule({ usageLimitPerUser: 1 }),
        ctx({ userUsageCount: 1 }),
      ),
    ).toMatchObject({
      code: "USER_LIMIT",
      message: "شما قبلاً از این کد تخفیف استفاده کرده‌اید.",
    });
    const three = validateCoupon(
      rule({ usageLimitPerUser: 3 }),
      ctx({ userUsageCount: 3 }),
    );
    if (!three.ok) expect(three.message).toContain("۳");
    expect(
      validateCoupon(rule({ usageLimitPerUser: 3 }), ctx({ userUsageCount: 2 }))
        .ok,
    ).toBe(true);
  });

  it("فقط سفارش اول: کاربر با سفارش پرداخت‌شده رد می‌شود", () => {
    const first = rule({ firstOrderOnly: true });
    expect(
      validateCoupon(first, ctx({ userHasPaidOrder: true })),
    ).toMatchObject({
      code: "FIRST_ORDER_ONLY",
    });
    expect(validateCoupon(first, ctx({ userHasPaidOrder: false })).ok).toBe(
      true,
    );
  });

  it("دامنه‌ی دسته: فقط اقلام همان دسته مشمول‌اند", () => {
    const category = rule({ scope: "CATEGORY", categoryIds: ["c-sweets"] });
    const result = validateCoupon(category, ctx());
    expect(result).toEqual({ ok: true, eligibleSubtotal: 220_000 });
    if (result.ok) {
      // ۱۰٪ فقط از قطاب (۲۲۰,۰۰۰) = ۲۲,۰۰۰ ⇒ گرد ⇒ ۲۲,۰۰۰
      expect(
        calculateDiscount(category, result.eligibleSubtotal, 740_000, null)
          .amount,
      ).toBe(22_000);
    }
    expect(
      validateCoupon(
        rule({ scope: "CATEGORY", categoryIds: ["c-gifts"] }),
        ctx(),
      ),
    ).toMatchObject({ code: "NOT_APPLICABLE" });
  });

  it("دامنه‌ی محصول", () => {
    const product = rule({ scope: "PRODUCT", productIds: ["p-baklava"] });
    expect(validateCoupon(product, ctx())).toEqual({
      ok: true,
      eligibleSubtotal: 520_000,
    });
  });

  it("ترتیب بررسی طبق سند: منقضی پیش از حداقل سبد", () => {
    const both = rule({
      expiresAt: new Date("2026-09-01T00:00:00Z"),
      minOrderAmount: 5_000_000,
    });
    expect(validateCoupon(both, ctx())).toMatchObject({ code: "EXPIRED" });
  });

  it("همه‌ی پیام‌های خطا متفاوت‌اند", () => {
    const messages = [
      validateCoupon(null, ctx()),
      validateCoupon(rule({ startsAt: new Date("2027-01-01") }), ctx()),
      validateCoupon(rule({ expiresAt: new Date("2026-01-01") }), ctx()),
      validateCoupon(rule({ minOrderAmount: 9_000_000 }), ctx()),
      validateCoupon(rule({ usageLimitTotal: 1, usedCount: 1 }), ctx()),
      validateCoupon(
        rule({ usageLimitPerUser: 1 }),
        ctx({ userUsageCount: 1 }),
      ),
      validateCoupon(
        rule({ firstOrderOnly: true }),
        ctx({ userHasPaidOrder: true }),
      ),
      validateCoupon(rule({ scope: "PRODUCT", productIds: ["x"] }), ctx()),
    ].map((result) => (result.ok ? "" : result.message));
    expect(new Set(messages).size).toBe(8);
  });
});

describe("describeCoupon", () => {
  it("خلاصه‌ی خوانا", () => {
    expect(describeCoupon(rule({ maxDiscountAmount: 100_000 }))).toBe(
      "۱۰٪ تا سقف ۱۰۰,۰۰۰ تومان",
    );
    expect(describeCoupon(rule({ type: "FIXED", value: 50_000 }))).toBe(
      "۵۰,۰۰۰ تومان",
    );
    expect(describeCoupon(rule({ type: "FREE_SHIPPING", value: 0 }))).toBe(
      "ارسال رایگان",
    );
  });
});
