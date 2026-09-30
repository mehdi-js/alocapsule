import Link from "next/link";

import type { SizeSwitchItem } from "@/lib/option-selection";
import { cn, toPersianDigits } from "@/lib/utils";

/**
 * سوییچ اندازه (SEO.md §۴.۵): لینک‌های واقعی `<a href>` به صفحه‌های
 * هم‌خانواده‌ی همان دسته («۱۱ · ۲۵ · ۳۳ · ۵۰ کیلویی»)؛ صفحه‌ی فعلی برجسته است
 * و پارامتر گزینه‌ی فعلی (`valve`/`fill`) حفظ می‌شود. رندر سمت سرور.
 */
export function SizeSwitch({
  items,
  suffix,
}: {
  items: SizeSwitchItem[];
  suffix: string;
}) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="اندازه‌های دیگر" data-size-switch>
      <ul className="flex flex-wrap items-center gap-2 text-sm">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              title={item.name}
              className={cn(
                "inline-flex min-w-11 justify-center rounded-full border px-3.5 py-1.5 transition",
                item.current
                  ? "border-brand-strong bg-brand-strong text-on-brand font-bold"
                  : "border-control text-ink-soft hover:border-strong",
              )}
            >
              {toPersianDigits(item.label)}
            </Link>
          </li>
        ))}
        {suffix ? <li className="text-muted">{suffix}</li> : null}
      </ul>
    </nav>
  );
}
