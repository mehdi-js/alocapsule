import { describe, expect, it } from "vitest";

import {
  PAY_ON_DELIVERY_LABEL,
  priceOrder,
  shippingCost,
  shippingCostLabel,
} from "@/lib/order-pricing";

const post = { cost: 90_000, freeAboveAmount: 3_000_000 };

describe("shippingCost", () => {
  it("زیر آستانه هزینه دارد و از آستانه به بعد رایگان است", () => {
    expect(shippingCost(post, 2_999_999)).toBe(90_000);
    expect(shippingCost(post, 3_000_000)).toBe(0);
  });

  it("بدون آستانه همیشه هزینه دارد", () => {
    expect(shippingCost({ cost: 60_000, freeAboveAmount: null }, 10e6)).toBe(
      60_000,
    );
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
