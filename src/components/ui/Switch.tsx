"use client";

import { cn } from "@/lib/utils";

/** کلید روشن/خاموش (role=switch)؛ در RTL دستگیره به سمت راست می‌رود. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** برچسب دسترسی‌پذیری (برای صفحه‌خوان) */
  label: string;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
        large ? "h-8 w-14" : "h-6 w-11",
        checked ? "bg-emerald-600" : "bg-neutral-300",
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow transition-transform",
          large ? "h-6 w-6" : "h-4 w-4",
          // RTL: خاموش = راست، روشن = چپ
          checked
            ? large
              ? "-translate-x-7"
              : "-translate-x-6"
            : "-translate-x-1",
        )}
      />
    </button>
  );
}
