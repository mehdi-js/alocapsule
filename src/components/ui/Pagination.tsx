import Link from "next/link";

import { cn, toPersianDigits } from "@/lib/utils";

/** صفحه‌بندی مبتنی بر لینک (سمت سرور)؛ `buildHref` آدرس هر صفحه را می‌سازد. */
export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const itemClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm";

  return (
    <nav
      aria-label="صفحه‌بندی"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className={cn(itemClass, "border-neutral-300 hover:bg-neutral-50")}
        >
          قبلی
        </Link>
      ) : null}
      {visible.map((value, index) => (
        <span key={value} className="contents">
          {index > 0 && value - (visible[index - 1] ?? value) > 1 ? (
            <span aria-hidden className="px-1 text-neutral-400">
              …
            </span>
          ) : null}
          <Link
            href={buildHref(value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(
              itemClass,
              value === page
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 hover:bg-neutral-50",
            )}
          >
            {toPersianDigits(value)}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link
          href={buildHref(page + 1)}
          className={cn(itemClass, "border-neutral-300 hover:bg-neutral-50")}
        >
          بعدی
        </Link>
      ) : null}
    </nav>
  );
}
