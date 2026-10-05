"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { ChevronDownIcon } from "./icons";

/** ارتفاع بسته‌ی متن (حدود یک سرتیتر و دو سه خط اول) */
const COLLAPSED_PX = 150;
/** اگر متن فقط کمی بلندتر از حالت بسته است، دکمه لازم نیست */
const SLACK_PX = 24;

/**
 * متن بلند که پیش‌فرض فقط ابتدایش دیده می‌شود (با محوشدگی پایین) و با دکمه‌ی فلش
 * باز و بسته می‌شود. 🔴 کل متن همیشه در DOM و HTML اولیه است (فقط با CSS بریده
 * شده، نه حذف) تا برای سئو کامل خوانده شود؛ بدون JavaScript هم کامل نمایش داده
 * می‌شود (`<noscript>`).
 */
export function CollapsibleText({
  children,
  className,
  moreLabel = "ادامه‌ی متن",
  lessLabel = "بستن",
}: {
  children: ReactNode;
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // متن کوتاه (یا صفحه‌ی عریض که متن در چند خط کم جا می‌شود) ⇒ بدون دکمه
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const inner = element.firstElementChild as HTMLElement | null;
    if (!inner) return;
    const measure = () =>
      setOverflowing(inner.offsetHeight > COLLAPSED_PX + SLACK_PX);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const collapsed = overflowing && !open;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative">
        <div
          id={id}
          ref={ref}
          data-collapsible-text
          data-state={collapsed ? "collapsed" : "open"}
          style={collapsed ? { maxHeight: COLLAPSED_PX } : undefined}
          className="overflow-hidden"
        >
          <div>{children}</div>
        </div>
        {collapsed ? (
          <div
            aria-hidden
            className="from-panel pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
          />
        ) : null}
      </div>
      {overflowing ? (
        <button
          type="button"
          data-collapsible-toggle
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="text-accent hover:text-accent-hover flex w-fit items-center gap-1.5 self-center text-sm font-bold transition"
        >
          {open ? lessLabel : moreLabel}
          <ChevronDownIcon
            size={16}
            className={cn("transition duration-200", open && "rotate-180")}
          />
        </button>
      ) : null}
      {/* بدون JavaScript دکمه کار نمی‌کند؛ متن کامل نشان داده شود */}
      <noscript>
        <style>{`[data-collapsible-text]{max-height:none!important}[data-collapsible-toggle]{display:none!important}`}</style>
      </noscript>
    </div>
  );
}
