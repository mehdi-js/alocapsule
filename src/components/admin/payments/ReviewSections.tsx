import Link from "next/link";
import type { ReactNode } from "react";

import { RichText } from "@/components/ui/RichText";
import { formatJalali, formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { shippingCostLabel } from "@/lib/order-pricing";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment";
import { toPersianDigits } from "@/lib/utils";
import type { OrderDetailDto } from "@/server/services/order-detail.service";
import type { PaymentReviewDto } from "@/server/services/payment-review-query.service";

import { PaymentStatusBadge } from "./StatusBadges";

export function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}

const WALLET_REASON_LABELS = {
  ADMIN_CREDIT: "شارژ توسط ادمین",
  ADMIN_DEBIT: "کسر توسط ادمین",
  ORDER_PAYMENT: "پرداخت سفارش",
  ORDER_REFUND: "بازگشت وجه سفارش",
} as const;

/** تصویر رسید در اندازه‌ی بزرگ؛ کلیک ⇒ اندازه‌ی کامل در تب جدید */
export function ReceiptPanel({ review }: { review: PaymentReviewDto }) {
  const { payment } = review;
  if (!payment.hasReceipt) {
    return (
      <Card title="رسید">
        <p className="text-sm text-neutral-600">
          {payment.method === "WALLET"
            ? "پرداخت از کیف پول انجام شده و رسید ندارد."
            : "هنوز رسیدی برای این پرداخت ثبت نشده است."}
        </p>
      </Card>
    );
  }
  const src = `/api/receipts/${payment.id}`;
  return (
    <Card title="تصویر رسید">
      <a href={src} target="_blank" rel="noopener" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- تصویر خصوصی از route handler با چک دسترسی؛ بهینه‌ساز next/image نباید کشش کند */}
        <img
          src={src}
          alt={`رسید پرداخت سفارش ${review.order.orderNumber}`}
          className="max-h-[70vh] w-full rounded-lg border border-neutral-200 object-contain"
        />
      </a>
      <p className="text-xs text-neutral-500">
        برای دیدن اندازه‌ی کامل روی تصویر بزنید.
      </p>
    </Card>
  );
}

export function PaymentInfo({ review }: { review: PaymentReviewDto }) {
  const { payment } = review;
  return (
    <Card title="اطلاعات پرداخت">
      <dl className="divide-y divide-neutral-100 text-sm">
        <Row label="وضعیت">
          <PaymentStatusBadge status={payment.status} />
        </Row>
        <Row label="روش">{PAYMENT_METHOD_LABELS[payment.method]}</Row>
        <Row label="مبلغ">{formatToman(payment.amount)} تومان</Row>
        {/* فرم رسید فقط تصویر دارد؛ این‌ها فقط برای رسیدهای قدیمی پر هستند */}
        {payment.referenceNumber ? (
          <Row label="شماره‌ی پیگیری">
            <span dir="ltr" className="font-mono">
              {toPersianDigits(payment.referenceNumber)}
            </span>
          </Row>
        ) : null}
        {payment.payerCardLast4 ? (
          <Row label="۴ رقم آخر کارت پرداخت‌کننده">
            {toPersianDigits(payment.payerCardLast4)}
          </Row>
        ) : null}
        {payment.paidAtClaimed ? (
          <Row label="تاریخ واریز (اعلام مشتری)">
            {formatJalali(payment.paidAtClaimed)}
          </Row>
        ) : null}
        <Row label="ثبت">{formatJalaliDateTime(payment.createdAt)}</Row>
        {payment.reviewedAt ? (
          <Row label="بررسی">
            {formatJalaliDateTime(payment.reviewedAt)}
            {payment.reviewer ? ` · ${toPersianDigits(payment.reviewer)}` : ""}
          </Row>
        ) : null}
        {payment.rejectReason ? (
          <Row label="دلیل رد">{payment.rejectReason}</Row>
        ) : null}
      </dl>
    </Card>
  );
}

export function OrderPanel({ detail }: { detail: OrderDetailDto }) {
  const { order, customer } = detail;
  return (
    <Card title={`سفارش ${order.orderNumber}`}>
      {order.emptyCylinders.length > 0 ? (
        <div
          role="note"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"
        >
          <p className="font-bold text-amber-900">
            کپسول‌های خالی قابل تحویل گرفتن
          </p>
          <ul className="mt-1 space-y-0.5 text-amber-900">
            {order.emptyCylinders.map((row) => (
              <li key={row.label}>
                {toPersianDigits(row.quantity)} × {row.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ul className="space-y-1.5 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span>
              {item.productName}{" "}
              <span className="text-neutral-500">
                ({item.variantTitle}) × {toPersianDigits(item.quantity)}
              </span>
            </span>
            <span className="shrink-0">{formatToman(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="divide-y divide-neutral-100 border-t border-neutral-200 pt-2 text-sm">
        <Row label="جمع کالاها">{formatToman(order.subtotal)} تومان</Row>
        <Row label={`ارسال (${order.shippingMethodName})`}>
          {shippingCostLabel(order.shippingTotal, order.shippingPayOnDelivery)}
        </Row>
        {order.discountTotal > 0 ? (
          <Row
            label={`تخفیف${order.couponCode ? ` (${order.couponCode})` : ""}`}
          >
            −{formatToman(order.discountTotal)} تومان
          </Row>
        ) : null}
        <Row label="مبلغ قابل پرداخت">
          <strong>{formatToman(order.grandTotal)} تومان</strong>
        </Row>
        <Row label="وضعیت سفارش">{ORDER_STATUS_LABELS[order.status]}</Row>
        <Row label="ثبت سفارش">{formatJalaliDateTime(order.placedAt)}</Row>
        {order.trackingCode ? (
          <Row label="کد رهگیری">
            <span dir="ltr" className="font-mono">
              {toPersianDigits(order.trackingCode)}
            </span>
          </Row>
        ) : null}
        {order.paidAt ? (
          <Row label="پرداخت تأییدشده">
            {formatJalaliDateTime(order.paidAt)}
          </Row>
        ) : null}
      </dl>
      <div className="space-y-1 border-t border-neutral-200 pt-3 text-sm">
        <p>
          مشتری: <span dir="ltr">{toPersianDigits(customer.phone)}</span>
          {customer.fullName ? ` · ${customer.fullName}` : ""}
          {` · کیف پول ${formatToman(customer.walletBalance)} تومان`}
        </p>
        {order.address ? (
          <p className="leading-7 text-neutral-600">
            {order.address.receiverName} (
            <span dir="ltr">
              {toPersianDigits(order.address.receiverPhone)}
            </span>
            ) — {order.address.province}، {order.address.city}،{" "}
            {order.address.line}
          </p>
        ) : order.pickup ? (
          <p className="font-bold text-neutral-700">تحویل حضوری (بدون آدرس)</p>
        ) : null}
        {order.serviceTerms ? (
          <p className="text-xs text-neutral-500">
            شرایط خدمت پذیرفته شد:{" "}
            {formatJalaliDateTime(order.serviceTerms.acceptedAt)}
          </p>
        ) : null}
        {order.serviceTerms ? (
          <details className="text-xs text-neutral-600">
            <summary className="cursor-pointer">
              متن شرایط پذیرفته‌شده (عیناً)
            </summary>
            <RichText
              text={order.serviceTerms.text}
              headingLevel={3}
              className="mt-2 text-sm leading-7"
            />
          </details>
        ) : null}
        {order.customerNote ? (
          <p className="text-neutral-600">
            توضیحات مشتری: {order.customerNote}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export function HistoryPanel({
  detail,
  currentPaymentId,
}: {
  detail: OrderDetailDto;
  /** پرداختی که صفحه‌اش باز است (بدون لینک) */
  currentPaymentId?: string;
}) {
  return (
    <Card title="سابقه">
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="mb-2 font-medium text-neutral-600">
            پرداخت‌های سفارش
          </h3>
          <ul className="space-y-1.5">
            {detail.history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={item.status} />
                {item.id === currentPaymentId ? (
                  <span>
                    {PAYMENT_METHOD_LABELS[item.method]} (همین پرداخت)
                  </span>
                ) : (
                  <Link
                    href={`/admin/payments/${item.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {PAYMENT_METHOD_LABELS[item.method]}
                  </Link>
                )}
                <span className="text-neutral-500">
                  {formatJalaliDateTime(item.createdAt)}
                </span>
                {item.rejectReason ? (
                  <span className="text-neutral-500">
                    — {item.rejectReason}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-medium text-neutral-600">وضعیت سفارش</h3>
          <ol className="space-y-1.5">
            {detail.statusHistory.map((item) => (
              <li key={item.id}>
                {ORDER_STATUS_LABELS[item.toStatus]}{" "}
                <span className="text-neutral-500">
                  · {formatJalaliDateTime(item.createdAt)}
                  {item.actor
                    ? ` · ${item.actorRole === "ADMIN" ? "ادمین" : "مشتری"}`
                    : ""}
                  {item.note ? ` · ${item.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
        {detail.walletTransactions.length > 0 ? (
          <div>
            <h3 className="mb-2 font-medium text-neutral-600">کیف پول</h3>
            <ul className="space-y-1.5">
              {detail.walletTransactions.map((tx) => (
                <li key={tx.id}>
                  {WALLET_REASON_LABELS[tx.reason]}:{" "}
                  {tx.type === "CREDIT" ? "+" : "−"}
                  {formatToman(tx.amount)} تومان{" "}
                  <span className="text-neutral-500">
                    · {formatJalaliDateTime(tx.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
