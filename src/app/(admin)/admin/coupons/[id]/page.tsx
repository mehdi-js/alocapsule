import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CouponStatusBadge } from "@/components/admin/coupons/CouponStatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { getCouponReport } from "@/server/services/coupon-admin.service";

export const metadata: Metadata = { title: "گزارش کد تخفیف" };

const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: "منتظر پرداخت",
  PAYMENT_REVIEW: "بررسی رسید",
  PAYMENT_REJECTED: "رسید رد شد",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  CANCELED: "لغو شد",
} as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export default async function CouponReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const report = await getCouponReport(id);
  if (!report) notFound();
  const { coupon } = report;

  return (
    <>
      <PageHeader
        title={coupon.code}
        crumbs={[
          { label: "کدهای تخفیف", href: "/admin/coupons" },
          { label: "گزارش استفاده" },
        ]}
        actions={
          <Link
            href={`/admin/coupons/${coupon.id}/edit`}
            className={buttonClasses("secondary")}
          >
            ویرایش
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
        <CouponStatusBadge status={coupon.status} />
        <span>{coupon.title}</span>
        <span>·</span>
        <span>{coupon.description}</span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="تعداد استفاده"
          value={`${toPersianDigits(coupon.usedCount)}${
            coupon.usageLimitTotal !== null
              ? ` از ${toPersianDigits(coupon.usageLimitTotal)}`
              : ""
          }`}
        />
        <Stat
          label="سفارش‌های ثبت‌شده با این کد"
          value={toPersianDigits(report.redemptionCount)}
        />
        <Stat
          label="جمع تخفیف داده‌شده"
          value={`${formatToman(report.totalDiscount)} تومان`}
        />
      </div>

      {report.redemptions.length === 0 ? (
        <EmptyState
          title="هنوز سفارشی با این کد ثبت نشده است"
          description="پس از ثبت سفارش با این کد، جزئیات هر استفاده اینجا نمایش داده می‌شود."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>سفارش</TH>
              <TH>مشتری</TH>
              <TH>تخفیف</TH>
              <TH>مبلغ سفارش</TH>
              <TH>وضعیت</TH>
              <TH>تاریخ</TH>
            </tr>
          </THead>
          <TBody>
            {report.redemptions.map((row) => (
              <TR key={row.id}>
                <TD dir="ltr" className="text-start font-mono">
                  {row.orderNumber}
                </TD>
                <TD dir="ltr" className="text-start">
                  {toPersianDigits(row.customer)}
                </TD>
                <TD>{formatToman(row.discountAmount)} تومان</TD>
                <TD>{formatToman(row.grandTotal)} تومان</TD>
                <TD>{ORDER_STATUS_LABELS[row.orderStatus]}</TD>
                <TD className="whitespace-nowrap">
                  {formatJalaliDateTime(row.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
