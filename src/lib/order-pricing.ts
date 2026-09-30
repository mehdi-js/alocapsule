import { calculateGrandTotal, formatToman } from "@/lib/money";

/**
 * قیمت‌گذاری سفارش (خالص؛ هم در صفحه‌ی تسویه برای نمایش و هم داخل تراکنش
 * ثبت سفارش برای مبلغ قطعی اجرا می‌شود).
 */

export interface ShippingRate {
  cost: number;
  /** اگر مبلغ کالا پس از تخفیف به این آستانه برسد، ارسال رایگان است */
  freeAboveAmount: number | null;
  /** اگر مجموع تعداد اقلام سبد به این عدد برسد، ارسال رایگان است */
  freeAboveQuantity: number | null;
}

/**
 * ارسال رایگان وقتی **مبلغ کالا پس از تخفیف** ≥ `freeAboveAmount` **یا**
 * **مجموع تعداد اقلام سبد** ≥ `freeAboveQuantity` (هرکدام برقرار باشد).
 */
export function shippingCost(
  rate: ShippingRate,
  goodsAmount: number,
  itemCount: number,
): number {
  if (rate.freeAboveAmount !== null && goodsAmount >= rate.freeAboveAmount) {
    return 0;
  }
  if (rate.freeAboveQuantity !== null && itemCount >= rate.freeAboveQuantity) {
    return 0;
  }
  return rate.cost;
}

/**
 * چند عدد دیگر تا رایگان شدن ارسال با پیک (برای پیام سبد)؛ `null` اگر روشی با
 * آستانه‌ی تعداد نیست، هزینه ندارد یا از قبل رایگان است. کمترین کمبود بین
 * روش‌ها را برمی‌گرداند.
 */
export function itemsUntilFreeShipping(
  methods: { cost: number; freeAboveQuantity: number | null }[],
  itemCount: number,
): number | null {
  let best: number | null = null;
  for (const method of methods) {
    if (method.cost <= 0 || method.freeAboveQuantity === null) continue;
    const remaining = method.freeAboveQuantity - itemCount;
    if (remaining <= 0) return null;
    if (best === null || remaining < best) best = remaining;
  }
  return best;
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
  /** مجموع تعداد اقلام سبد (مبنای ارسال رایگان تعدادی) */
  itemCount: number;
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
    input.itemCount,
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
