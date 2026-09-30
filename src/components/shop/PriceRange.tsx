"use client";

import { useState } from "react";

import { formatToman } from "@/lib/money";

const STEP = 10_000;

/**
 * اسلایدر دوگانه‌ی قیمت. تغییر فقط پس از رها کردن دستگیره اعمال می‌شود تا با
 * هر حرکت یک درخواست تازه به سرور نرود. در RTL کمینه سمت راست است.
 */
export function PriceRange({
  bounds,
  value,
  onCommit,
}: {
  bounds: { min: number; max: number };
  value: { min: number | null; max: number | null };
  onCommit: (range: { min: number | null; max: number | null }) => void;
}) {
  const floor = Math.floor(bounds.min / STEP) * STEP;
  const ceil = Math.ceil(bounds.max / STEP) * STEP;
  const [low, setLow] = useState(value.min ?? floor);
  const [high, setHigh] = useState(value.max ?? ceil);

  if (ceil <= floor) return null;

  const span = ceil - floor;
  const lowPct = ((low - floor) / span) * 100;
  const highPct = ((high - floor) / span) * 100;

  function commit() {
    onCommit({
      // مقدار برابر با مرز یعنی «بدون محدودیت»
      min: low <= floor ? null : low,
      max: high >= ceil ? null : high,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-border-control" />
        <div
          className="bg-brand-strong absolute top-1.5 h-1 rounded-full"
          style={{ right: `${lowPct}%`, left: `${100 - highPct}%` }}
        />
        <input
          type="range"
          dir="rtl"
          min={floor}
          max={ceil}
          step={STEP}
          value={low}
          aria-label="کمترین قیمت"
          aria-valuetext={`${formatToman(low)} تومان`}
          onChange={(event) =>
            setLow(Math.min(Number(event.target.value), high - STEP))
          }
          onPointerUp={commit}
          onKeyUp={commit}
          className="dual-range"
        />
        <input
          type="range"
          dir="rtl"
          min={floor}
          max={ceil}
          step={STEP}
          value={high}
          aria-label="بیشترین قیمت"
          aria-valuetext={`${formatToman(high)} تومان`}
          onChange={(event) =>
            setHigh(Math.max(Number(event.target.value), low + STEP))
          }
          onPointerUp={commit}
          onKeyUp={commit}
          className="dual-range"
        />
      </div>
      <div className="text-muted flex justify-between text-xs">
        <span>{formatToman(low)} تومان</span>
        <span>{formatToman(high)} تومان</span>
      </div>
    </div>
  );
}
