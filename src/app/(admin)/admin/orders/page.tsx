import type { Metadata } from "next";
import Link from "next/link";

import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { orderFiltersQuery, parseOrderFilters } from "@/lib/order-filters";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { cn, toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { searchAdminOrders } from "@/server/services/order-admin.service";
import { getOrderNumberPrefix } from "@/server/services/order-number.service";

export const metadata: Metadata = { title: "سفارش‌ها" };

const STATUS_CHIPS: { status: OrderStatus | ""; label: string }[] = [
  { status: "", label: "همه" },
  { status: "PROCESSING", label: "آماده‌ی ارسال" },
  { status: "PAYMENT_REVIEW", label: ORDER_STATUS_LABELS.PAYMENT_REVIEW },
  { status: "PENDING_PAYMENT", label: ORDER_STATUS_LABELS.PENDING_PAYMENT },
  { status: "PAYMENT_REJECTED", label: ORDER_STATUS_LABELS.PAYMENT_REJECTED },
  { status: "SHIPPED", label: ORDER_STATUS_LABELS.SHIPPED },
  { status: "DELIVERED", label: ORDER_STATUS_LABELS.DELIVERED },
  { status: "CANCELED", label: ORDER_STATUS_LABELS.CANCELED },
];

/** جدول سفارش‌ها: فیلتر وضعیت و تاریخ شمسی، جستجوی شماره یا موبایل، CSV */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { filters, error } = parseOrderFilters(await searchParams);
  const { rows, total, pageCount, counts } = await searchAdminOrders(filters);
  const numberPrefix = await getOrderNumberPrefix();
  const allCount = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <>
      <PageHeader
        title="سفارش‌ها"
        crumbs={[{ label: "سفارش‌ها" }]}
        actions={
          <a
            href={`/api/admin/orders/export${orderFiltersQuery(filters)}`}
            className={buttonClasses("secondary")}
          >
            خروجی CSV
          </a>
        }
      />

      <nav aria-label="فیلتر وضعیت" className="mb-4 flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const active = (filters.status ?? "") === chip.status;
          const count = chip.status ? (counts[chip.status] ?? 0) : allCount;
          return (
            <Link
              key={chip.status || "all"}
              href={`/admin/orders${orderFiltersQuery(filters, { status: chip.status })}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white hover:bg-neutral-50",
              )}
            >
              {chip.label}{" "}
              <span className="opacity-70">({toPersianDigits(count)})</span>
            </Link>
          );
        })}
      </nav>

      <form
        role="search"
        className="mb-5 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_160px_160px_auto] sm:items-end"
      >
        {filters.raw.status ? (
          <input type="hidden" name="status" value={filters.raw.status} />
        ) : null}
        <Field label="شماره‌ی سفارش یا موبایل" htmlFor="orders-q">
          <Input
            id="orders-q"
            name="q"
            defaultValue={filters.raw.q}
            placeholder={`${numberPrefix}-1405… یا 0912…`}
            dir="ltr"
          />
        </Field>
        <Field label="از تاریخ" htmlFor="orders-from">
          <Input
            id="orders-from"
            name="from"
            defaultValue={filters.raw.from}
            placeholder="1405/07/01"
            dir="ltr"
          />
        </Field>
        <Field label="تا تاریخ" htmlFor="orders-to">
          <Input
            id="orders-to"
            name="to"
            defaultValue={filters.raw.to}
            placeholder="1405/07/30"
            dir="ltr"
          />
        </Field>
        <div className="flex gap-2">
          <button type="submit" className={buttonClasses("primary")}>
            اعمال
          </button>
          <Link href="/admin/orders" className={buttonClasses("ghost")}>
            پاک کردن
          </Link>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-600 sm:col-span-4">
            {error}
          </p>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-neutral-500">
        {toPersianDigits(total)} سفارش
      </p>
      {rows.length === 0 ? (
        <EmptyState title="سفارشی با این فیلترها پیدا نشد" />
      ) : (
        <div className="space-y-5">
          <OrdersTable rows={rows} />
          <Pagination
            page={filters.page}
            pageCount={pageCount}
            buildHref={(page) =>
              `/admin/orders${orderFiltersQuery(filters, { page })}`
            }
          />
        </div>
      )}
    </>
  );
}
