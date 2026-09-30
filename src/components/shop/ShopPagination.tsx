import Link from "next/link";

import { cn, toPersianDigits } from "@/lib/utils";

import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const item =
  "flex size-10 items-center justify-center rounded-full border border-[rgb(201_168_118/0.22)] text-sm transition hover:border-[rgb(201_168_118/0.55)]";

/** صفحه‌بندی گرد شماره‌دار (صفحه‌ی فعال سبز) */
export function ShopPagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav
      aria-label="صفحه‌بندی"
      className="flex items-center justify-center gap-2.5"
    >
      {page > 1 ? (
        <Link href={buildHref(page - 1)} aria-label="صفحه قبل" className={item}>
          <ChevronRightIcon size={15} />
        </Link>
      ) : null}
      {pages.map((value, index) => (
        <span key={value} className="contents">
          {index > 0 && value - (pages[index - 1] ?? value) > 1 ? (
            <span aria-hidden className="text-muted px-1">
              …
            </span>
          ) : null}
          <Link
            href={buildHref(value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(
              item,
              value === page &&
                "border-action bg-action text-action-ink hover:border-action font-bold",
            )}
          >
            {toPersianDigits(value)}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={buildHref(page + 1)} aria-label="صفحه بعد" className={item}>
          <ChevronLeftIcon size={15} />
        </Link>
      ) : null}
    </nav>
  );
}
