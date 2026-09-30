"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/** کپی متن در کلیپ‌بورد با بازخورد «کپی شد» */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** برچسب دسترس‌پذیر، مثلاً «کپی شماره کارت» */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        "rounded-full border border-[rgb(201_168_118/0.35)] px-3.5 py-1.5 text-xs font-bold transition hover:bg-card",
        copied ? "text-action" : "text-gold",
        className,
      )}
    >
      <span aria-live="polite">{copied ? "کپی شد ✓" : "کپی"}</span>
    </button>
  );
}
