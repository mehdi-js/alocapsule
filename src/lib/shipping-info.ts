import { formatToman } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";

/**
 * ردیف اطلاعات ارسال صفحه‌ی محصول (SEO.md §۴.۸): از روش‌های ارسالِ **فعال**
 * ساخته می‌شود، نه متن ثابت؛ روش غیرفعال خودبه‌خود از ردیف حذف می‌شود.
 */

export interface ShippingInfoMethod {
  name: string;
  requiresAddress: boolean;
  cost: number;
  payOnDelivery: boolean;
  deliveryEstimate: string | null;
  freeAboveQuantity: number | null;
}

export interface ShippingInfoItem {
  key: string;
  kind: "delivery" | "pickup" | "free";
  text: string;
}

/**
 * - هر روش: «ارسال عادی: ۱ روزه» (بدون زمان فقط نام)؛ هزینه‌ی مثبت کنار آن.
 * - تحویل حضوری (بدون آدرس) بدون زمان خودش، ساعت `business.pickupHours` را می‌گیرد.
 * - روش دارای آستانه‌ی ارسال رایگان تعدادی: «ارسال عادی رایگان از ۱۰۰ عدد به بالا».
 */
export function buildShippingInfo(
  methods: readonly ShippingInfoMethod[],
  pickupHours: string,
): ShippingInfoItem[] {
  const items: ShippingInfoItem[] = [];
  methods.forEach((method, index) => {
    const pickup = !method.requiresAddress;
    const estimate = method.deliveryEstimate ?? (pickup ? pickupHours : null);
    const cost =
      !pickup && !method.payOnDelivery && method.cost > 0
        ? ` · هزینه ${formatToman(method.cost)} تومان`
        : "";
    items.push({
      key: `method-${index}`,
      kind: pickup ? "pickup" : "delivery",
      text: `${method.name}${estimate ? `: ${estimate}` : ""}${cost}`,
    });
  });
  methods.forEach((method, index) => {
    if (method.requiresAddress && method.freeAboveQuantity !== null) {
      items.push({
        key: `free-${index}`,
        kind: "free",
        text: `${method.name} رایگان از ${toPersianDigits(method.freeAboveQuantity)} عدد به بالا`,
      });
    }
  });
  return items;
}
