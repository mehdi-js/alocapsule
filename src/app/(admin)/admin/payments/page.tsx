import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentsTable } from "@/components/admin/payments/PaymentsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import {
  listPaymentQueue,
  type PaymentFilter,
} from "@/server/services/payment-review-query.service";

export const metadata: Metadata = { title: "پرداخت‌ها" };

const TABS: { filter: PaymentFilter; label: string }[] = [
  { filter: "SUBMITTED", label: "در انتظار بررسی" },
  { filter: "APPROVED", label: "تأییدشده" },
  { filter: "REJECTED", label: "ردشده" },
  { filter: "ALL", label: "همه" },
];

const EMPTY: Record<PaymentFilter, string> = {
  SUBMITTED: "رسیدی در انتظار بررسی نیست",
  APPROVED: "هنوز پرداختی تأیید نشده است",
  REJECTED: "رسید ردشده‌ای وجود ندارد",
  ALL: "هنوز پرداختی ثبت نشده است",
};

function parseFilter(value: string | undefined): PaymentFilter {
  return TABS.some((tab) => tab.filter === value)
    ? (value as PaymentFilter)
    : "SUBMITTED";
}

/** صف بررسی رسیدها (قدیمی‌ترین اول) و سابقه‌ی پرداخت‌ها */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const filter = parseFilter((await searchParams).status);
  const { rows, counts } = await listPaymentQueue(filter);

  const countFor = (tab: PaymentFilter) =>
    tab === "ALL"
      ? counts.SUBMITTED + counts.APPROVED + counts.REJECTED
      : counts[tab];

  return (
    <>
      <PageHeader title="پرداخت‌ها" crumbs={[{ label: "پرداخت‌ها" }]} />
      <nav aria-label="فیلتر وضعیت" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.filter}
            href={`/admin/payments?status=${tab.filter}`}
            aria-current={tab.filter === filter ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              tab.filter === filter
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white hover:bg-neutral-50",
            )}
          >
            {tab.label}{" "}
            <span className="opacity-70">
              ({toPersianDigits(countFor(tab.filter))})
            </span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title={EMPTY[filter]} />
      ) : (
        <PaymentsTable rows={rows} />
      )}
    </>
  );
}
