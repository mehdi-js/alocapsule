import type { SeoSummary } from "@/lib/seo/analyze";
import { cn, toPersianDigits } from "@/lib/utils";

const COLORS = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
} as const;

export function seoSummaryLabel(summary: SeoSummary): string {
  if (summary.bad === 0 && summary.warn === 0) return "سئو: همه‌ی موارد خوب";
  return `سئو: ${toPersianDigits(summary.bad)} مشکل، ${toPersianDigits(summary.warn)} هشدار`;
}

/** دایره‌ی وضعیت سئو در لیست ادمین (قرمز: مشکل، نارنجی: هشدار) */
export function SeoStatusDot({ summary }: { summary: SeoSummary }) {
  const label = seoSummaryLabel(summary);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-neutral-600"
      title={label}
    >
      <span
        aria-hidden
        className={cn("size-3 rounded-full", COLORS[summary.level])}
      />
      <span className="sr-only">{label}</span>
      {summary.bad + summary.warn > 0 ? (
        <span aria-hidden>
          {toPersianDigits(summary.bad)}/{toPersianDigits(summary.warn)}
        </span>
      ) : null}
    </span>
  );
}
