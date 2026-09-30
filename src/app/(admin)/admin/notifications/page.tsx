import type { Metadata } from "next";
import Link from "next/link";

import { DeliveryStatusButton } from "@/components/admin/notifications/DeliveryStatusButton";
import { RetryNotificationButton } from "@/components/admin/orders/OrderActionButtons";
import { PageHeader } from "@/components/admin/PageHeader";
import { NotificationStatusBadge } from "@/components/admin/payments/StatusBadges";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalaliDateTime } from "@/lib/date";
import { NOTIFICATION_LABELS } from "@/lib/notification-templates";
import { cn, toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { MAX_NOTIFICATION_ATTEMPTS } from "@/server/services/notification.service";
import {
  listNotifications,
  type NotificationFilter,
} from "@/server/services/notification-admin.service";

export const metadata: Metadata = { title: "پیامک‌ها" };

const TABS: { filter: NotificationFilter; label: string }[] = [
  { filter: "ALL", label: "همه" },
  { filter: "FAILED", label: "ناموفق" },
  { filter: "PENDING", label: "در انتظار" },
  { filter: "SENT", label: "ارسال‌شده" },
];

/** لاگ پیامک‌ها (کد ورود + سفارش) و وضعیت هر کدام (بند ۷.۶) */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const requested = (await searchParams).status;
  const filter = TABS.find((tab) => tab.filter === requested)?.filter ?? "ALL";
  const { rows, counts } = await listNotifications(filter);
  const countFor = (tab: NotificationFilter) =>
    tab === "ALL" ? counts.PENDING + counts.SENT + counts.FAILED : counts[tab];

  return (
    <>
      <PageHeader
        title="پیامک‌ها"
        crumbs={[{ label: "پیامک‌ها" }]}
        actions={
          <Link
            href="/admin/notifications/settings"
            className={buttonClasses("secondary")}
          >
            متن و الگوی پیامک‌ها
          </Link>
        }
      />
      <p className="mb-4 text-sm leading-7 text-neutral-600">
        پیامک ناموفق حداکثر {toPersianDigits(MAX_NOTIFICATION_ATTEMPTS)} بار
        فرستاده می‌شود (اولین ارسال + تلاش‌های{" "}
        <code dir="ltr">npm run job:retry-notifications</code>).
      </p>
      <nav aria-label="فیلتر وضعیت" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.filter}
            href={`/admin/notifications?status=${tab.filter}`}
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
        <EmptyState title="پیامکی در این فهرست نیست" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>رویداد</TH>
              <TH>سفارش</TH>
              <TH>گیرنده</TH>
              <TH>متن</TH>
              <TH>وضعیت</TH>
              <TH>تلاش</TH>
              <TH>زمان</TH>
              <TH>
                <span className="sr-only">عملیات</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD className="whitespace-nowrap">
                  {NOTIFICATION_LABELS[row.type]}
                </TD>
                <TD
                  dir="ltr"
                  className="text-start font-mono whitespace-nowrap"
                >
                  {row.order ? (
                    <Link
                      href={`/admin/orders/${row.order.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {row.order.orderNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD dir="ltr" className="text-start">
                  {toPersianDigits(row.phone)}
                </TD>
                <TD className="min-w-64 text-xs leading-6 text-neutral-600">
                  {row.text}
                  {row.errorMessage ? (
                    <span className="block text-red-600">
                      {row.errorMessage}
                    </span>
                  ) : null}
                  {row.providerMessageId ? (
                    <span dir="ltr" className="block text-neutral-400">
                      recId {row.providerMessageId}
                    </span>
                  ) : null}
                </TD>
                <TD>
                  <NotificationStatusBadge status={row.status} />
                </TD>
                <TD className="whitespace-nowrap">
                  {toPersianDigits(row.attempts)} از{" "}
                  {toPersianDigits(MAX_NOTIFICATION_ATTEMPTS)}
                </TD>
                <TD className="whitespace-nowrap">
                  {formatJalaliDateTime(row.sentAt ?? row.createdAt)}
                </TD>
                <TD>
                  {row.canRetry ? (
                    <RetryNotificationButton logId={row.id} />
                  ) : null}
                  {row.canCheckDelivery ? (
                    <DeliveryStatusButton logId={row.id} />
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
