import { getSetting } from "@/server/repositories/setting.repository";

/** پیش‌فرض سقف تعداد هر خط سبد (بخش ۷.۱ سند) */
export const DEFAULT_MAX_QUANTITY_PER_ITEM = 99;

/**
 * سقف تعداد هر خط سبد از `Setting`. این انبارداری نیست؛ فقط جلوی خطای تایپ
 * مشتری را می‌گیرد. مقدار نامعتبر به پیش‌فرض برمی‌گردد.
 */
export async function getMaxQuantityPerItem(): Promise<number> {
  const value = await getSetting("maxQuantityPerItem");
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_MAX_QUANTITY_PER_ITEM;
}
