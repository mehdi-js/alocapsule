import { calculateGrandTotal, formatToman } from "@/lib/money";

/**
 * قیمت‌گذاری سفارش (خالص؛ هم در صفحه‌ی تسویه برای نمایش و هم داخل تراکنش
 * ثبت سفارش برای مبلغ قطعی اجرا می‌شود).
 */

export interface ShippingRate {
  cost: number;
  /** اگر مبلغ کالا پس از تخفیف به این آستانه برسد، ارسال رایگان است */
  freeAboveAmount: number | null;
}

/** آستانه‌ی ارسال رایگان با مبلغ کالا **پس از تخفیف** مقایسه می‌شود */
export function shippingCost(rate: ShippingRate, goodsAmount: number): number {
  if (rate.freeAboveAmount !== null && goodsAmount >= rate.freeAboveAmount) {
    return 0;
  }
  return rate.cost;
}

/** برچسب هزینه‌ی پیک درب منزل (به‌جای «رایگان») */
export const PAY_ON_DELIVERY_LABEL = "درب منزل، به پیک";

/**
 * متن ردیف هزینه‌ی ارسال: روش «پرداخت درب منزل» ⇒ برچسب پیک (نه «رایگان»)،
 * صفر ⇒ «رایگان»، وگرنه مبلغ.
 */
export function shippingCostLabel(
  shippingTotal: number,
  payOnDelivery: boolean,
): string {
  if (payOnDelivery) return PAY_ON_DELIVERY_LABEL;
  if (shippingTotal === 0) return "رایگان";
  return `${formatToman(shippingTotal)} تومان`;
}

export interface OrderPricingInput {
  subtotal: number;
  /** تخفیف کالایی کد (درصدی یا مبلغ ثابت)؛ برای کد ارسال رایگان صفر است */
  itemsDiscount: number;
  /** کد از نوع FREE_SHIPPING: تخفیف = هزینه‌ی ارسال (بند ۷.۳) */
  freeShippingCoupon: boolean;
  shipping: ShippingRate;
}

export interface OrderPricing {
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
}

export function priceOrder(input: OrderPricingInput): OrderPricing {
  const itemsDiscount = Math.min(
    Math.max(input.itemsDiscount, 0),
    input.subtotal,
  );
  const shippingTotal = shippingCost(
    input.shipping,
    input.subtotal - itemsDiscount,
  );
  const discountTotal = input.freeShippingCoupon
    ? shippingTotal
    : itemsDiscount;

  return {
    subtotal: input.subtotal,
    shippingTotal,
    discountTotal,
    grandTotal: calculateGrandTotal(
      input.subtotal,
      shippingTotal,
      discountTotal,
    ),
  };
}
