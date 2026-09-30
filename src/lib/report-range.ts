import {
  addTehranDays,
  formatJalali,
  jalaliToDate,
  parseJalaliDateInput,
  startOfTehranDay,
  tehranWeekday,
  toJalaliParts,
} from "@/lib/date";
import { toPersianDigits } from "@/lib/utils";

/**
 * بازه‌های گزارش به وقت تهران و تقویم شمسی. همه‌ی بازه‌ها نیم‌باز‌اند:
 * `from ≤ placedAt < to`.
 */

export type RangePreset = "today" | "7d" | "30d" | "custom";

export const RANGE_PRESETS: { preset: RangePreset; label: string }[] = [
  { preset: "today", label: "امروز" },
  { preset: "7d", label: "۷ روز اخیر" },
  { preset: "30d", label: "۳۰ روز اخیر" },
  { preset: "custom", label: "بازه‌ی دلخواه" },
];

/** سقف طول بازه‌ی دلخواه (نمودار روزانه) */
export const MAX_RANGE_DAYS = 366;

export interface ReportRange {
  preset: RangePreset;
  from: Date;
  /** انحصاری: ابتدای روزِ بعد از آخرین روز */
  to: Date;
  days: number;
  /** مثل «۱۴۰۵/۰۶/۰۲ تا ۱۴۰۵/۰۷/۰۱» */
  label: string;
}

export type RangeResult =
  { ok: true; range: ReportRange } | { ok: false; message: string };

function build(preset: RangePreset, from: Date, to: Date): ReportRange {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const last = addTehranDays(to, -1);
  const label =
    days === 1
      ? formatJalali(from)
      : `${formatJalali(from)} تا ${formatJalali(last)}`;
  return { preset, from, to, days, label };
}

/** بازه‌ی گزارش از پارامترهای صفحه؛ ورودی نامعتبر ⇒ پیام خطا */
export function resolveRange(
  params: { preset?: string; from?: string; to?: string },
  now: Date = new Date(),
): RangeResult {
  const today = startOfTehranDay(now);
  const tomorrow = addTehranDays(today, 1);
  switch (params.preset ?? "30d") {
    case "today":
      return { ok: true, range: build("today", today, tomorrow) };
    case "7d":
      return {
        ok: true,
        range: build("7d", addTehranDays(today, -6), tomorrow),
      };
    case "30d":
      return {
        ok: true,
        range: build("30d", addTehranDays(today, -29), tomorrow),
      };
    case "custom": {
      let from: Date | null;
      let to: Date | null;
      try {
        from = parseJalaliDateInput(params.from ?? "");
        to = parseJalaliDateInput(params.to ?? "");
      } catch {
        return { ok: false, message: "تاریخ نامعتبر است (مثال: ۱۴۰۵/۰۷/۰۱)" };
      }
      if (!from || !to) {
        return { ok: false, message: "تاریخ شروع و پایان را وارد کنید" };
      }
      if (from > to) {
        return {
          ok: false,
          message: "تاریخ پایان نباید قبل از تاریخ شروع باشد",
        };
      }
      const end = addTehranDays(to, 1);
      const range = build("custom", from, end);
      if (range.days > MAX_RANGE_DAYS) {
        return {
          ok: false,
          message: `بازه‌ی گزارش حداکثر ${toPersianDigits(MAX_RANGE_DAYS)} روز است`,
        };
      }
      return { ok: true, range };
    }
    default:
      return { ok: false, message: "بازه‌ی گزارش نامعتبر است" };
  }
}

export interface CalendarPeriods {
  today: { from: Date; to: Date };
  /** از شنبه‌ی همین هفته تا پایان امروز */
  week: { from: Date; to: Date };
  /** از اول ماه شمسی جاری تا پایان امروز */
  month: { from: Date; to: Date };
}

/** بازه‌های تقویمی کارت‌های داشبورد */
export function calendarPeriods(now: Date = new Date()): CalendarPeriods {
  const today = startOfTehranDay(now);
  const to = addTehranDays(today, 1);
  const { year, month } = toJalaliParts(now);
  return {
    today: { from: today, to },
    week: { from: addTehranDays(today, -tehranWeekday(now)), to },
    month: { from: jalaliToDate(year, month, 1), to },
  };
}

/** همه‌ی روزهای بازه (برای پر کردن روزهای بدون فروش در نمودار) */
export function rangeDays(range: { from: Date; to: Date }): Date[] {
  const days: Date[] = [];
  for (let day = range.from; day < range.to; day = addTehranDays(day, 1)) {
    days.push(day);
  }
  return days;
}
