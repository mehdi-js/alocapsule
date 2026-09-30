import { toPersianDigits } from "@/lib/utils";

/**
 * ساعات کاری شعبه به تفکیک روز (`Branch.openingHours`):
 * `{ days: [{ day, open, close }], note }`. روز بسته در `days` نیست. `note`
 * متن آزاد (مثلاً «تعطیلات رسمی بسته است») یا متن منتقل‌شده از نسخه‌ی قبلی.
 */

export const WEEK_DAYS = [
  { key: "saturday", label: "شنبه", schema: "Saturday" },
  { key: "sunday", label: "یکشنبه", schema: "Sunday" },
  { key: "monday", label: "دوشنبه", schema: "Monday" },
  { key: "tuesday", label: "سه‌شنبه", schema: "Tuesday" },
  { key: "wednesday", label: "چهارشنبه", schema: "Wednesday" },
  { key: "thursday", label: "پنجشنبه", schema: "Thursday" },
  { key: "friday", label: "جمعه", schema: "Friday" },
] as const;

export type DayKey = (typeof WEEK_DAYS)[number]["key"];

export interface DayHours {
  day: DayKey;
  /** «HH:MM» ۲۴ ساعته */
  open: string;
  close: string;
}

export interface OpeningHours {
  days: DayHours[];
  note: string;
}

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_KEYS = new Set<string>(WEEK_DAYS.map((day) => day.key));

export function parseOpeningHours(value: unknown): OpeningHours {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const days = Array.isArray(record.days)
    ? record.days.filter(
        (item): item is DayHours =>
          typeof item === "object" &&
          item !== null &&
          DAY_KEYS.has((item as DayHours).day) &&
          TIME_PATTERN.test(String((item as DayHours).open)) &&
          TIME_PATTERN.test(String((item as DayHours).close)),
      )
    : [];
  const order = (day: DayKey) => WEEK_DAYS.findIndex((d) => d.key === day);
  return {
    days: [...days].sort((a, b) => order(a.day) - order(b.day)),
    note: typeof record.note === "string" ? record.note.trim() : "",
  };
}

const label = (day: DayKey) => WEEK_DAYS.find((d) => d.key === day)!.label;

/**
 * خطوط نمایشی: روزهای پشت‌سرهم با ساعت یکسان گروه می‌شوند
 * («شنبه تا چهارشنبه: ۱۰:۰۰ تا ۲۳:۰۰»). بدون روز ⇒ فقط `note`.
 */
export function formatOpeningHours(hours: OpeningHours): string[] {
  const lines: string[] = [];
  const indexOf = (day: DayKey) => WEEK_DAYS.findIndex((d) => d.key === day);
  let group: DayHours[] = [];
  const flush = () => {
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) return;
    const days =
      group.length === 7
        ? "همه روزه"
        : group.length === 1
          ? label(first.day)
          : `${label(first.day)} تا ${label(last.day)}`;
    lines.push(
      `${days}: ${toPersianDigits(first.open)} تا ${toPersianDigits(first.close)}`,
    );
    group = [];
  };
  for (const day of hours.days) {
    const previous = group.at(-1);
    const sameTimes =
      previous && previous.open === day.open && previous.close === day.close;
    const consecutive =
      previous && indexOf(day.day) === indexOf(previous.day) + 1;
    if (previous && !(sameTimes && consecutive)) flush();
    group.push(day);
  }
  flush();
  if (hours.note) lines.push(hours.note);
  return lines;
}

/** schema.org `openingHoursSpecification` (فقط از روزهای ثبت‌شده) */
export function openingHoursSpecification(hours: OpeningHours) {
  return hours.days.map((day) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: `https://schema.org/${WEEK_DAYS.find((d) => d.key === day.day)!.schema}`,
    opens: day.open,
    closes: day.close,
  }));
}
