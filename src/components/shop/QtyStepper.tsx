"use client";

import { cn, toPersianDigits } from "@/lib/utils";

import { MinusIcon, PlusIcon } from "./icons";

const stepButton =
  "flex items-center justify-center rounded-full bg-canvas transition hover:bg-canvas-hover disabled:cursor-not-allowed disabled:opacity-40";

/** شمارنده‌ی تعداد؛ سقف = `maxQuantityPerItem` از تنظیمات (نه موجودی) */
export function QtyStepper({
  value,
  max,
  onChange,
  size = "md",
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const small = size === "sm";
  const button = cn(stepButton, small ? "size-[28px]" : "size-[34px]");
  return (
    <div
      role="group"
      aria-label="تعداد"
      className={cn(
        "bg-card flex items-center rounded-full border border-[rgb(201_168_118/0.22)]",
        small ? "gap-2 px-1.5 py-1" : "gap-3.5 px-2.5 py-2",
      )}
    >
      {/* ترتیب طراحی در RTL: کاهش راست، افزایش چپ */}
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="کاهش تعداد"
        className={button}
      >
        <MinusIcon size={small ? 13 : 15} />
      </button>
      <output
        aria-live="polite"
        className={cn(
          "text-center font-bold",
          small ? "min-w-5 text-sm" : "min-w-[26px] text-[17px]",
        )}
      >
        {toPersianDigits(value)}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="افزایش تعداد"
        className={button}
      >
        <PlusIcon size={small ? 13 : 15} />
      </button>
    </div>
  );
}
