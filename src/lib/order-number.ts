import { type DateInput, formatJalali } from "@/lib/date";

/**
 * شماره‌ی سفارش خوانا: `AL-{تاریخ شمسی تهران}-{ردیف روز}`، مثل
 * `AL-14040625-0031`. ردیف هر روز از ۱ شروع می‌شود و حداقل ۴ رقم دارد.
 */

export const ORDER_NUMBER_PATTERN = /^AL-\d{8}-\d{4,}$/;

/** `AL-14040625-` برای روزِ `date` به وقت تهران */
export function orderNumberPrefix(date: DateInput): string {
  return `AL-${formatJalali(date, "YYYYMMDD", { digits: "en" })}-`;
}

export function formatOrderNumber(date: DateInput, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError(`Invalid order sequence: ${sequence}`);
  }
  return `${orderNumberPrefix(date)}${String(sequence).padStart(4, "0")}`;
}
