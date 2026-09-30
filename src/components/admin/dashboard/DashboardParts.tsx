import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { formatToman } from "@/lib/money";
import { RANGE_PRESETS, type RangePreset } from "@/lib/report-range";
import { cn, toPersianDigits } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </>
  );
  const className = "rounded-xl border border-neutral-200 bg-white p-5";
  return href ? (
    <Link
      href={href}
      className={cn(className, "block hover:border-neutral-400")}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function toman(value: number): string {
  return `${formatToman(value)} تومان`;
}

export function ordersHint(count: number): string {
  return `${toPersianDigits(count)} سفارش`;
}

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border border-neutral-200 bg-white p-5",
        className,
      )}
    >
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** انتخاب بازه‌ی گزارش: پیش‌تنظیم‌ها (لینک) + بازه‌ی دلخواه شمسی (فرم GET) */
export function RangeFilter({
  preset,
  from,
  to,
  error,
}: {
  preset: RangePreset;
  from: string;
  to: string;
  error: string | null;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <nav aria-label="بازه‌ی گزارش" className="flex flex-wrap gap-2">
        {RANGE_PRESETS.filter((p) => p.preset !== "custom").map((p) => (
          <Link
            key={p.preset}
            href={`/admin?preset=${p.preset}`}
            aria-current={p.preset === preset ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              p.preset === preset
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white hover:bg-neutral-50",
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <form className="grid gap-3 sm:grid-cols-[160px_160px_auto] sm:items-end">
        <input type="hidden" name="preset" value="custom" />
        <Field label="از تاریخ" htmlFor="range-from">
          <Input
            id="range-from"
            name="from"
            defaultValue={from}
            placeholder="1405/07/01"
            dir="ltr"
          />
        </Field>
        <Field label="تا تاریخ" htmlFor="range-to">
          <Input
            id="range-to"
            name="to"
            defaultValue={to}
            placeholder="1405/07/30"
            dir="ltr"
          />
        </Field>
        <button
          type="submit"
          className={cn(
            buttonClasses(preset === "custom" ? "primary" : "secondary"),
            "sm:w-fit",
          )}
        >
          نمایش بازه‌ی دلخواه
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
