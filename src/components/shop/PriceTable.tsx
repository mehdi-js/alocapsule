import Link from "next/link";

import { formatToman } from "@/lib/money";
import type { PriceTable as PriceTableData } from "@/lib/option-selection";

/**
 * جدول قیمت (SEO.md §۴.۶): `<table>` واقعی با `<caption>` و `<th scope>`،
 * رندر سمت سرور. `rowHeader`: در hub نام محصول، در صفحه‌ی محصول عنوان گروه
 * میانی (یا «قیمت»). ترکیب غیرفعال/نبود «—».
 */
export function PriceTable({
  table,
  caption,
  note,
  updatedLabel,
  mode,
  id,
}: {
  table: PriceTableData;
  caption: string;
  /** جمله‌ی «قیمت شامل چیست» بالای جدول */
  note: string;
  updatedLabel: string | null;
  mode: "category" | "product";
  id?: string;
}) {
  if (table.rows.length === 0) return null;
  return (
    <section id={id} className="flex flex-col gap-3" data-price-table>
      <h2 className="text-xl font-extrabold md:text-2xl">{caption}</h2>
      <p className="text-ink-soft max-w-[860px] text-sm leading-7">{note}</p>
      <div className="overflow-x-auto rounded-[14px] border border-hair">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-card/60">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {mode === "category" ? "محصول" : "ترکیب"}
              </th>
              {table.columns.map((column) => (
                <th
                  key={column.code}
                  scope="col"
                  className="px-4 py-3 text-start font-bold"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.key} className="border-t border-hair">
                <th scope="row" className="px-4 py-3 text-start font-medium">
                  {mode === "category" ? (
                    <Link
                      href={row.href}
                      className="text-accent hover:underline"
                    >
                      {row.midLabel
                        ? `${row.productName} · ${row.midLabel}`
                        : row.productName}
                    </Link>
                  ) : (
                    (row.midLabel ?? "قیمت")
                  )}
                </th>
                {row.cells.map((cell, index) => (
                  <td key={table.columns[index]!.code} className="px-4 py-3">
                    {cell ? (
                      <Link
                        href={cell.href}
                        className="whitespace-nowrap hover:underline"
                      >
                        {formatToman(cell.price)} تومان
                      </Link>
                    ) : (
                      <span aria-label="موجود نیست">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {updatedLabel ? (
        <p className="text-muted text-xs">
          آخرین به‌روزرسانی قیمت: {updatedLabel}
        </p>
      ) : null}
    </section>
  );
}
