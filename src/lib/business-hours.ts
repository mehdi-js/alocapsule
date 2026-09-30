import { toPersianDigits } from "@/lib/utils";

/**
 * ساعات کاری برای روش‌های ارسالِ «فقط ساعات کاری» (مثل ارسال فوری؛ SEO.md
 * §۴.۸). زمان همیشه **وقت تهران** است، نه ساعت سرور یا مرورگر. روزهای هفته
 * بررسی نمی‌شود (روزهای کاری هنوز تعیین نشده: SEO.md §۱۳.۳ مورد ۱۵).
 */

const TEHRAN = "Asia/Tehran";

/** ساعت به‌صورت کسری (۹:۳۰ ⇒ ۹.۵) به وقت تهران */
export function tehranHourFraction(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TEHRAN,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return get("hour") + get("minute") / 60;
}

/** بازه‌ی نیمه‌باز [شروع، پایان)؛ ساعت ۱۸:۰۰ دیگر ساعت کاری نیست */
export function isWithinBusinessHours(
  now: Date,
  openHour: number,
  closeHour: number,
): boolean {
  const hour = tehranHourFraction(now);
  return hour >= openHour && hour < closeHour;
}

export function businessHoursOnlyMessage(
  methodName: string,
  openHour: number,
  closeHour: number,
): string {
  return `${methodName} فقط در ساعات کاری (${toPersianDigits(openHour)} تا ${toPersianDigits(closeHour)}) قابل انتخاب است.`;
}
