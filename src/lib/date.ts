import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import jalaliday from "jalaliday/dayjs";

import { toLatinDigits, toPersianDigits } from "@/lib/utils";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(jalaliday);

/** ذخیره‌سازی همیشه UTC است؛ نمایش و مرزهای روز/ماه به وقت تهران. */
export const APP_TIMEZONE = "Asia/Tehran";

export type DateInput = Date | string | number;

export interface JalaliParts {
  year: number;
  /** ۱ تا ۱۲ */
  month: number;
  day: number;
}

export interface FormatJalaliOptions {
  /** پیش‌فرض `fa` (ارقام فارسی)؛ `en` برای خروجی لاتین (مثلاً CSV). */
  digits?: "fa" | "en";
}

function toTehran(date: DateInput) {
  const value = dayjs(date);
  if (!value.isValid()) {
    throw new RangeError(`Invalid date: ${String(date)}`);
  }
  return value.tz(APP_TIMEZONE).calendar("jalali");
}

/** قالب‌بندی تاریخ شمسی، مثلاً `۱۴۰۴/۰۱/۰۱`. */
export function formatJalali(
  date: DateInput,
  format = "YYYY/MM/DD",
  { digits = "fa" }: FormatJalaliOptions = {},
): string {
  const formatted = toTehran(date).format(format);
  return digits === "fa" ? toPersianDigits(formatted) : formatted;
}

/** `۱۴۰۴/۰۱/۰۱ ۰۰:۳۰` */
export function formatJalaliDateTime(
  date: DateInput,
  options?: FormatJalaliOptions,
): string {
  return formatJalali(date, "YYYY/MM/DD HH:mm", options);
}

/** `۱ فروردین ۱۴۰۴` */
export function formatJalaliLong(
  date: DateInput,
  options?: FormatJalaliOptions,
): string {
  const formatted = toTehran(date).locale("fa").format("D MMMM YYYY");
  return options?.digits === "en" ? formatted : toPersianDigits(formatted);
}

/** اجزای تاریخ شمسی (به وقت تهران). */
export function toJalaliParts(date: DateInput): JalaliParts {
  const value = toTehran(date);
  return { year: value.year(), month: value.month() + 1, day: value.date() };
}

/**
 * تبدیل تاریخ و ساعت شمسی (به وقت تهران) به `Date` (لحظه‌ی UTC).
 * تاریخ نامعتبر مثل ۳۰ اسفند سال غیرکبیسه یا ماه ۱۳ خطا می‌دهد.
 */
export function jalaliToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const pad = (n: number, length = 2) => String(n).padStart(length, "0");
  const jalaliInput = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

  // پارس بدون منطقه‌ی زمانی؛ فقط برای تبدیل تقویم استفاده می‌شود.
  const parsed = dayjs(jalaliInput, { jalali: true });
  const isValid =
    parsed.isValid() &&
    parsed.calendar("jalali").format("YYYY-MM-DD") === jalaliInput;
  if (!isValid || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError(
      `Invalid Jalali date: ${jalaliInput} ${hour}:${minute}`,
    );
  }

  const gregorian = parsed.calendar("gregory").format("YYYY-MM-DD");
  return dayjs
    .tz(`${gregorian} ${pad(hour)}:${pad(minute)}`, APP_TIMEZONE)
    .toDate();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ورودی متنی تاریخ شمسی فرم‌ها: `۱۴۰۵/۰۷/۰۱` یا `1405-7-1` (ارقام فارسی هم).
 * خالی ⇒ `null`؛ نامعتبر ⇒ RangeError. خروجی: ابتدای آن روز به وقت تهران.
 */
export function parseJalaliDateInput(input: string): Date | null {
  const value = toLatinDigits(input).trim();
  if (!value) return null;
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(value);
  if (!match) throw new RangeError(`Invalid Jalali date input: ${input}`);
  return jalaliToDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** آخرین لحظه‌ی همان روز تهران (برای «تا تاریخ …» شامل کل روز) */
export function endOfTehranDay(startOfDay: Date): Date {
  return new Date(startOfDay.getTime() + DAY_MS - 1);
}

/** مقدار پیش‌فرض ورودی تاریخ فرم: `1405/07/01` */
export function toJalaliDateInput(date: Date | null): string {
  return date ? formatJalali(date, "YYYY/MM/DD", { digits: "en" }) : "";
}

/** ابتدای روزِ `date` به وقت تهران */
export function startOfTehranDay(date: DateInput): Date {
  const { year, month, day } = toJalaliParts(date);
  return jalaliToDate(year, month, day);
}

/**
 * `n` روز بعد/قبل از ابتدای یک روز تهران ⇒ ابتدای همان روز. (۳ ساعت
 * حاشیه تا تغییر ساعت تابستانی قدیمی هم روز را جابه‌جا نکند.)
 */
export function addTehranDays(startOfDay: Date, days: number): Date {
  return startOfTehranDay(
    new Date(startOfDay.getTime() + days * DAY_MS + 3 * 60 * 60 * 1000),
  );
}

/** روز هفته به وقت تهران: ۰ = شنبه … ۶ = جمعه */
export function tehranWeekday(date: DateInput): number {
  return (toTehran(date).day() + 1) % 7;
}

/** تاریخ میلادی محلی تهران (`2026-09-23`، خروجی SQL) ⇒ ابتدای همان روز */
export function fromTehranIsoDate(isoDate: string): Date {
  return dayjs.tz(`${isoDate} 00:00`, APP_TIMEZONE).toDate();
}
