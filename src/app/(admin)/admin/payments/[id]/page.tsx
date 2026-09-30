import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/PageHeader";
import { CancelOrderButton } from "@/components/admin/payments/CancelOrderButton";
import { DeletePaymentButton } from "@/components/admin/payments/DeletePaymentButton";
import { PaymentReviewActions } from "@/components/admin/payments/PaymentReviewActions";
import {
  Card,
  HistoryPanel,
  OrderPanel,
  PaymentInfo,
  ReceiptPanel,
} from "@/components/admin/payments/ReviewSections";
import { OrderStatusBadge } from "@/components/admin/payments/StatusBadges";
import { buttonClasses } from "@/components/ui/Button";
import { formatToman } from "@/lib/money";
import { requireAdmin } from "@/server/auth/current-user";
import { canDeletePayment } from "@/server/services/order-delete.service";
import { getPaymentReview } from "@/server/services/payment-review-query.service";

export const metadata: Metadata = { title: "بررسی پرداخت" };

/** بررسی رسید: تصویر بزرگ + اطلاعات پرداخت + تأیید/رد + لغو سفارش */
export default async function PaymentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const review = await getPaymentReview((await params).id);
  if (!review) notFound();
  const { payment, order } = review;
  const paid = order.paidAt !== null;

  return (
    <>
      <PageHeader
        title={`پرداخت سفارش ${order.orderNumber}`}
        crumbs={[
          { label: "پرداخت‌ها", href: "/admin/payments" },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <Link
              href={`/admin/orders/${order.id}`}
              className={buttonClasses("secondary", "sm")}
            >
              صفحه‌ی سفارش
            </Link>
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <ReceiptPanel review={review} />
          <HistoryPanel detail={review} currentPaymentId={payment.id} />
        </div>
        <div className="space-y-6">
          {payment.status === "SUBMITTED" ? (
            <Card title="بررسی">
              <p className="text-sm leading-7 text-neutral-600">
                مبلغ{" "}
                <strong className="text-neutral-900">
                  {formatToman(payment.amount)} تومان
                </strong>{" "}
                را با صورت‌حساب بانک مطابقت دهید، سپس تأیید یا رد کنید.
              </p>
              <PaymentReviewActions
                paymentId={payment.id}
                amount={payment.amount}
              />
            </Card>
          ) : null}
          <PaymentInfo review={review} />
          {canDeletePayment(payment.status) ? (
            <Card title="حذف پرداخت">
              <p className="text-sm leading-7 text-neutral-600">
                این پرداخت{" "}
                {payment.status === "REJECTED" ? "رد شده" : "استفاده نشده"} است
                و می‌توان آن را از سابقه‌ی سفارش حذف کرد.
              </p>
              <DeletePaymentButton paymentId={payment.id} />
            </Card>
          ) : null}
          <OrderPanel detail={review} />
          {review.canCancel ? (
            <Card title="لغو سفارش">
              <p className="text-sm leading-7 text-neutral-600">
                {paid
                  ? "این سفارش پرداخت شده است؛ با لغو، کل مبلغ به کیف پول مشتری برمی‌گردد."
                  : "این سفارش هنوز پرداخت نشده است."}
              </p>
              <CancelOrderButton
                orderId={order.id}
                paid={paid}
                amount={order.grandTotal}
              />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
