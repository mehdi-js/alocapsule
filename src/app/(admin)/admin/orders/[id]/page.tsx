import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteOrderCard } from "@/components/admin/orders/DeleteOrderCard";
import {
  MarkDeliveredButton,
  RetryNotificationButton,
} from "@/components/admin/orders/OrderActionButtons";
import { ShipOrderForm } from "@/components/admin/orders/ShipOrderForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { CancelOrderButton } from "@/components/admin/payments/CancelOrderButton";
import {
  Card,
  HistoryPanel,
  OrderPanel,
} from "@/components/admin/payments/ReviewSections";
import {
  NotificationStatusBadge,
  OrderStatusBadge,
} from "@/components/admin/payments/StatusBadges";
import { buttonClasses } from "@/components/ui/Button";
import { formatJalaliDateTime } from "@/lib/date";
import { NOTIFICATION_LABELS } from "@/lib/notification-templates";
import { toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { MAX_NOTIFICATION_ATTEMPTS } from "@/server/services/notification.service";
import { getAdminOrder } from "@/server/services/order-admin.service";

export const metadata: Metadata = { title: "جزئیات سفارش" };

/** سفارش: ارسال با کد رهگیری، تحویل، لغو، و وضعیت پیامک‌های آن */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const page = await getAdminOrder((await params).id);
  if (!page) notFound();
  const { detail, notifications } = page;
  const { order } = detail;

  return (
    <>
      <PageHeader
        title={`سفارش ${order.orderNumber}`}
        crumbs={[
          { label: "سفارش‌ها", href: "/admin/orders" },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {page.latestPaymentId ? (
              <Link
                href={`/admin/payments/${page.latestPaymentId}`}
                className={buttonClasses("secondary", "sm")}
              >
                پرداخت و رسید
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          {order.status === "PROCESSING" ? (
            <Card title="ارسال سفارش">
              <ShipOrderForm orderId={order.id} />
            </Card>
          ) : null}
          {order.status === "SHIPPED" ? (
            <Card title="تحویل">
              <p className="text-sm text-neutral-600">
                پس از تحویل به مشتری، وضعیت را «تحویل شد» کنید.
              </p>
              <MarkDeliveredButton orderId={order.id} />
            </Card>
          ) : null}
          <Card title="پیامک‌ها">
            {notifications.length === 0 ? (
              <p className="text-sm text-neutral-500">
                هنوز پیامکی برای این سفارش ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {notifications.map((log) => (
                  <li
                    key={log.id}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <NotificationStatusBadge status={log.status} />
                    <span className="font-medium">
                      {NOTIFICATION_LABELS[log.type]}
                    </span>
                    <span className="text-neutral-500">
                      {formatJalaliDateTime(log.sentAt ?? log.createdAt)} · تلاش{" "}
                      {toPersianDigits(log.attempts)} از{" "}
                      {toPersianDigits(MAX_NOTIFICATION_ATTEMPTS)}
                    </span>
                    {log.errorMessage ? (
                      <span className="w-full text-xs text-red-600">
                        {log.errorMessage}
                      </span>
                    ) : null}
                    {log.status === "FAILED" &&
                    log.attempts < MAX_NOTIFICATION_ATTEMPTS ? (
                      <RetryNotificationButton logId={log.id} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {detail.canCancel ? (
            <Card title="لغو سفارش">
              <CancelOrderButton
                orderId={order.id}
                paid={order.paidAt !== null}
                amount={order.grandTotal}
              />
            </Card>
          ) : null}
          <HistoryPanel detail={detail} />
          <DeleteOrderCard
            orderId={order.id}
            orderNumber={order.orderNumber}
            paid={order.paidAt !== null}
          />
        </div>
        <OrderPanel detail={detail} />
      </div>
    </>
  );
}
