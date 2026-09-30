import { cn, toPersianDigits } from "@/lib/utils";

/** شمارنده‌ی زنده‌ی کاراکتر با بازه‌ی پیشنهادی */
export function CharCount({
  value,
  min,
  max,
  suffix,
}: {
  value: string;
  min: number;
  max: number;
  /** مثلاً «با نام برند» */
  suffix?: string;
}) {
  const length = value.trim().length;
  const ok = length >= min && length <= max;
  return (
    <p
      className={cn(
        "text-xs",
        length === 0
          ? "text-neutral-400"
          : ok
            ? "text-emerald-700"
            : "text-amber-700",
      )}
    >
      {toPersianDigits(length)} کاراکتر{suffix ? ` ${suffix}` : ""} — پیشنهاد:{" "}
      {toPersianDigits(min)} تا {toPersianDigits(max)}
    </p>
  );
}
