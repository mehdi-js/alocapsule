import { toPersianDigits } from "@/lib/utils";

/**
 * منطق خالص تعداد در سبد. 🔴 این انبارداری نیست: سقف فقط `maxQuantityPerItem`
 * تنظیمات است تا جلوی خطای تایپ مشتری را بگیرد (بخش ۷.۱ سند).
 */

export interface ClampResult {
  quantity: number;
  /** اگر تعداد درخواستی از سقف بیشتر بود */
  capped: boolean;
}

export function clampQuantity(requested: number, cap: number): ClampResult {
  const safe = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  return safe > cap
    ? { quantity: cap, capped: true }
    : { quantity: safe, capped: false };
}

/** ادغام دو خط سبد (مهمان + کاربر): جمع تعداد، با اعمال سقف */
export function mergeQuantities(
  a: number,
  b: number,
  cap: number,
): ClampResult {
  return clampQuantity(a + b, cap);
}

export function capMessage(cap: number): string {
  return `از هر محصول حداکثر ${toPersianDigits(cap)} عدد قابل سفارش است؛ تعداد به ${toPersianDigits(cap)} اصلاح شد.`;
}

export function removedItemMessage(name: string): string {
  return `«${name}» دیگر قابل سفارش نیست و از سبد شما حذف شد.`;
}
