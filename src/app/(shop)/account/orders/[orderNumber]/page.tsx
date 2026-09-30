import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CancelMyOrder } from "@/components/shop/account/CancelMyOrder";
import { OrderStatusPill } from "@/components/shop/account/OrderStatusPill";
import { ArrowIcon } from "@/components/shop/icons";
import { btnPrimary, panel } from "@/components/shop/styles";
import { formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { shippingCostLabel } from "@/lib/order-pricing";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment";
import { cn, safeDecode, toPersianDigits } from "@/lib/utils";
import { requireUser } from "@/server/auth/current-user";
import { getMyOrder } from "@/server/services/account.service";

export const metadata: Metadata = { title: "جزئیات سفارش" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-bold">{children}</dd>
    </div>
  );
}

/** جزئیات سفارش مشتری؛ سفارش دیگران ۴۰۴ است */
export default async function MyOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const user = await requireUser();
  const order = await getMyOrder(
    safeDecode((await params).orderNumber),
    user.id,
  );
  if (!order) notFound();
  const payHref = `/checkout/pay/${encodeURIComponent(order.orderNumber)}`;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/account/orders"
        className="text-gold hover:text-gold-hover flex w-fit items-center gap-2 text-sm"
      >
        همه‌ی سفارش‌ها
        <ArrowIcon />
      </Link>

      <section
        className={cn(panel, "flex flex-col gap-4 p-5 md:p-6")}
        aria-labelledby="order-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="order-heading" className="text-lg font-extrabold">
            سفارش{" "}
            <span dir="ltr" className="text-gold font-mono">
              {order.orderNumber}
            </span>
          </h2>
          <OrderStatusPill status={order.status} label={order.statusLabel} />
        </div>

        {order.status === "PAYMENT_REJECTED" && order.lastPayment ? (
          <p role="alert" className="text-danger text-sm leading-7">
            رسید پرداخت تأیید نشد
            {order.lastPayment.rejectReason
              ? `: ${order.lastPayment.rejectReason}`
              : ""}
          </p>
        ) : null}
        {order.trackingCode ? (
          <p className="text-sm">
            کد رهگیری ارسال:{" "}
            <span dir="ltr" className="text-gold font-mono font-bold">
              {toPersianDigits(order.trackingCode)}
            </span>
          </p>
        ) : null}

        {order.canPay || order.canCancel ? (
          <div className="flex flex-wrap items-center gap-3">
            {order.canPay ? (
              <Link href={payHref} className={btnPrimary}>
                {order.status === "PAYMENT_REJECTED"
                  ? "بارگذاری رسید جدید"
                  : "پرداخت و بارگذاری رسید"}
              </Link>
            ) : null}
            {order.canCancel ? (
              <CancelMyOrder orderNumber={order.orderNumber} />
            ) : null}
          </div>
        ) : order.status === "PAYMENT_REVIEW" ? (
          <Link href={payHref} className="text-gold text-sm underline">
            مشاهده‌ی وضعیت پرداخت
          </Link>
        ) : null}

        <ol className="border-gold/20 flex flex-col gap-2 border-s-2 ps-4 text-sm">
          {order.timeline.map((entry) => (
            <li key={entry.id}>
              <span className="font-bold">{entry.label}</span>{" "}
              <span className="text-muted">
                · {formatJalaliDateTime(entry.at)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={cn(panel, "flex flex-col gap-4 p-5 md:p-6")}>
          <h3 className="font-extrabold">اقلام سفارش</h3>
          <ul className="flex flex-col gap-2.5 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {item.productName}{" "}
                  <span className="text-muted">
                    ({item.variantTitle}) × {toPersianDigits(item.quantity)}
                  </span>
                </span>
                <span className="shrink-0">{formatToman(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2.5 border-t border-[rgb(201_168_118/0.14)] pt-4 text-sm">
            <Row label="جمع کالاها">{formatToman(order.subtotal)} تومان</Row>
            <Row label={`ارسال (${order.shippingMethodName})`}>
              {shippingCostLabel(
                order.shippingTotal,
                order.shippingPayOnDelivery,
              )}
            </Row>
            {order.discountTotal > 0 ? (
              <Row
                label={`تخفیف${order.couponCode ? ` (${order.couponCode})` : ""}`}
              >
                <span className="text-gold">
                  −{formatToman(order.discountTotal)} تومان
                </span>
              </Row>
            ) : null}
            <Row label="مبلغ کل">
              <span className="text-action">
                {formatToman(order.grandTotal)} تومان
              </span>
            </Row>
            {order.lastPayment && order.paidAt ? (
              <Row label="پرداخت">
                {PAYMENT_METHOD_LABELS[order.lastPayment.method]}
              </Row>
            ) : null}
          </dl>
        </section>

        <section
          className={cn(panel, "flex flex-col gap-3 p-5 text-sm md:p-6")}
        >
          <h3 className="font-extrabold">
            {order.pickup ? "تحویل" : "ارسال به"}
          </h3>
          {order.address ? (
            <>
              <p className="font-bold">
                {order.address.receiverName}{" "}
                <span dir="ltr" className="text-ink-2 font-medium">
                  {toPersianDigits(order.address.receiverPhone)}
                </span>
              </p>
              <p className="text-ink-2 leading-7">
                {order.address.province}، {order.address.city}،{" "}
                {order.address.line}
                {order.address.postalCode
                  ? ` · کد پستی ${toPersianDigits(order.address.postalCode)}`
                  : ""}
              </p>
            </>
          ) : order.pickup ? (
            <p className="font-bold">تحویل حضوری (بدون آدرس)</p>
          ) : null}
          {order.customerNote ? (
            <p className="text-muted leading-7">
              توضیحات: {order.customerNote}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
