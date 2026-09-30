import { type DateInput, formatJalali } from "@/lib/date";

/**
 * شماره‌ی سفارش خوانا: `{پیشوند}-{تاریخ شمسی تهران}-{ردیف روز}`، مثل
 * `XX-14040625-0031`. پیشوند از کلید `order.numberPrefix` در `Setting` خوانده
 * می‌شود (`getOrderNumberPrefix`)؛ هیچ پیشوند ثابتی در منطق کد نیست. ردیف هر
 * روز از ۱ شروع می‌شود و حداقل ۴ رقم دارد.
 */

export const ORDER_NUMBER_PREFIX_KEY = "order.numberPrefix";

/** فقط مقدار پیش‌فرض کلید `order.numberPrefix` (seed و وقتی کلید نبود/نامعتبر است) */
export const DEFAULT_ORDER_NUMBER_PREFIX = "AC";

const PREFIX_PATTERN = /^[A-Z][A-Z0-9]{0,7}$/;

/** پیشوند معتبر: ۱ تا ۸ حرف بزرگ لاتین/عدد و شروع با حرف */
export function isValidOrderNumberPrefix(value: unknown): value is string {
  return typeof value === "string" && PREFIX_PATTERN.test(value);
}

/** مقدار خام تنظیمات ⇒ پیشوند معتبر (نبود/نامعتبر ⇒ پیش‌فرض) */
export function parseOrderNumberPrefix(value: unknown): string {
  return isValidOrderNumberPrefix(value) ? value : DEFAULT_ORDER_NUMBER_PREFIX;
}

/** با هر پیشوند معتبر کار می‌کند تا تغییر پیشوند شماره‌های قبلی را نشکند */
export const ORDER_NUMBER_PATTERN = /^[A-Z][A-Z0-9]{0,7}-\d{8}-\d{4,}$/;

/** `XX-14040625-` برای روزِ `date` به وقت تهران */
export function orderNumberPrefix(date: DateInput, prefix: string): string {
  return `${prefix}-${formatJalali(date, "YYYYMMDD", { digits: "en" })}-`;
}

export function formatOrderNumber(
  date: DateInput,
  sequence: number,
  prefix: string,
): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError(`Invalid order sequence: ${sequence}`);
  }
  return `${orderNumberPrefix(date, prefix)}${String(sequence).padStart(4, "0")}`;
}
