import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import { transitionOrderStatus } from "./order-status.service";

/**
 * انقضای سفارش‌های پرداخت‌نشده (بند ۷.۵): «در انتظار پرداخت» یا «رسید تأیید
 * نشد» که ۷۲ ساعت هیچ تغییر وضعیتی نداشته‌اند (یعنی ۷۲ ساعت پس از ثبت یا
 * پس از رد رسید، بدون رسید تازه) لغو می‌شوند و کد تخفیفشان آزاد می‌شود.
 */

export const ORDER_EXPIRY_HOURS = 72;
const BATCH_SIZE = 500;
export const EXPIRY_NOTE = "لغو خودکار: ۷۲ ساعت بدون پرداخت";

export interface ExpirySummary {
  expired: number;
  failed: number;
}

export async function expireStaleOrders(
  now: Date = new Date(),
): Promise<ExpirySummary> {
  const cutoff = new Date(now.getTime() - ORDER_EXPIRY_HOURS * 3_600_000);
  const orders = await db.order.findMany({
    where: {
      status: { in: ["PENDING_PAYMENT", "PAYMENT_REJECTED"] },
      paidAt: null,
      statusHistory: { none: { createdAt: { gte: cutoff } } },
      placedAt: { lt: cutoff },
    },
    orderBy: { placedAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, orderNumber: true },
  });

  const summary: ExpirySummary = { expired: 0, failed: 0 };
  for (const order of orders) {
    try {
      // انتقال شرطی است: اگر هم‌زمان رسید آمده باشد، لغو انجام نمی‌شود
      await transitionOrderStatus({
        orderId: order.id,
        to: "CANCELED",
        actorUserId: null,
        note: EXPIRY_NOTE,
      });
      summary.expired++;
    } catch (error) {
      summary.failed++;
      logger.warn("order_expiry_skipped", {
        orderNumber: order.orderNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return summary;
}
