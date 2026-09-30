import { describe, expect, it } from "vitest";

import {
  itemsUntilFreeShipping,
  PAY_ON_DELIVERY_LABEL,
  priceOrder,
  shippingCost,
  shippingCostLabel,
} from "@/lib/order-pricing";

const post = {
  cost: 90_000,
  freeAboveAmount: 3_000_000,
  freeAboveQuantity: null,
};

describe("shippingCost", () => {
  it("زیر آستانه هزینه دارد و از آستانه به بعد رایگان است", () => {
    expect(shippingCost(post, 2_999_999, 1)).toBe(90_000);
    expect(shippingCost(post, 3_000_000, 1)).toBe(0);
  });

  it("بدون آستانه همیشه هزینه دارد", () => {
    expect(
      shippingCost(
        { cost: 60_000, freeAboveAmount: null, freeAboveQuantity: null },
        10e6,
        500,
      ),
    ).toBe(60_000);
  });
});

describe("ارسال رایگان تعدادی (FORK.md §۳.۳)", () => {
  const courier = {
    cost: 100_000,
    freeAboveAmount: null,
    freeAboveQuantity: 10,
  };

  it("۱۰ عدد ⇒ رایگان؛ ۹ عدد ⇒ هزینه‌ی عادی", () => {
    expect(shippingCost(courier, 1_000_000, 10)).toBe(0);
    expect(shippingCost(courier, 1_000_000, 11)).toBe(0);
    expect(shippingCost(courier, 1_000_000, 9)).toBe(100_000);
  });

  it("مبلغ یا تعداد؛ هرکدام برقرار باشد رایگان است", () => {
    const both = {
      cost: 100_000,
      freeAboveAmount: 5_000_000,
      freeAboveQuantity: 10,
    };
    expect(shippingCost(both, 5_000_000, 1)).toBe(0);
    expect(shippingCost(both, 100_000, 10)).toBe(0);
    expect(shippingCost(both, 4_999_999, 9)).toBe(100_000);
  });

  it("مبنا مجموع تعداد است، نه تعداد خطوط (تعداد کل ۱۰ با چند خط)", () => {
    const pricing = priceOrder({
      subtotal: 4_000_000,
      itemsDiscount: 0,
      freeShippingCoupon: false,
      shipping: courier,
      itemCount: 3 + 7,
    });
    expect(pricing.shippingTotal).toBe(0);
    expect(pricing.grandTotal).toBe(4_000_000);
  });

  it("پیام «N عدد دیگر»: کمترین کمبود بین روش‌های هزینه‌دار", () => {
    expect(itemsUntilFreeShipping([courier], 7)).toBe(3);
    expect(itemsUntilFreeShipping([courier], 9)).toBe(1);
    expect(itemsUntilFreeShipping([courier], 10)).toBeNull();
    // روش رایگان یا بدون آستانه پیشنهاد نمی‌دهد
    expect(
      itemsUntilFreeShipping(
        [
          { cost: 0, freeAboveQuantity: 10 },
          { cost: 50_000, freeAboveQuantity: null },
        ],
        1,
      ),
    ).toBeNull();
    expect(
      itemsUntilFreeShipping(
        [courier, { cost: 60_000, freeAboveQuantity: 5 }],
        3,
      ),
    ).toBe(2);
  });
});

describe("priceOrder", () => {
  it("آستانه‌ی ارسال رایگان با مبلغ پس از تخفیف مقایسه می‌شود", () => {
    // ۳٬۲۰۰٬۰۰۰ با ۳۲۰٬۰۰۰ تخفیف = ۲٬۸۸۰٬۰۰۰ < آستانه
    const pricing = priceOrder({
      subtotal: 3_200_000,
      itemsDiscount: 320_000,
      freeShippingCoupon: false,
      shipping: post,
      itemCount: 1,
    });
    expect(pricing).toEqual({
      subtotal: 3_200_000,
      shippingTotal: 90_000,
      discountTotal: 320_000,
      grandTotal: 2_970_000,
    });
  });

  it("کد ارسال رایگان: تخفیف = هزینه‌ی ارسال", () => {
    const pricing = priceOrder({
      subtotal: 500_000,
      itemsDiscount: 0,
      freeShippingCoupon: true,
      shipping: post,
      itemCount: 1,
    });
    expect(pricing.shippingTotal).toBe(90_000);
    expect(pricing.discountTotal).toBe(90_000);
    expect(pricing.grandTotal).toBe(500_000);
  });

  it("کد ارسال رایگان وقتی ارسال خودش رایگان است: تخفیف صفر", () => {
    const pricing = priceOrder({
      subtotal: 3_500_000,
      itemsDiscount: 0,
      freeShippingCoupon: true,
      shipping: post,
      itemCount: 1,
    });
    expect(pricing.discountTotal).toBe(0);
    expect(pricing.grandTotal).toBe(3_500_000);
  });

  it("فرمول واحد: grandTotal = subtotal + shipping − discount و تخفیف هرگز بیش از کالا", () => {
    const pricing = priceOrder({
      subtotal: 100_000,
      itemsDiscount: 250_000,
      freeShippingCoupon: false,
      shipping: post,
      itemCount: 1,
    });
    expect(pricing.discountTotal).toBe(100_000);
    expect(pricing.grandTotal).toBe(
      pricing.subtotal + pricing.shippingTotal - pricing.discountTotal,
    );
    expect(pricing.grandTotal).toBe(90_000);
  });
});

describe("برچسب هزینه‌ی ارسال", () => {
  it("پرداخت درب منزل به پیک ⇒ نه «رایگان»", () => {
    expect(shippingCostLabel(0, true)).toBe(PAY_ON_DELIVERY_LABEL);
    expect(shippingCostLabel(0, false)).toBe("رایگان");
    expect(shippingCostLabel(60_000, false)).toBe("۶۰,۰۰۰ تومان");
  });
});
