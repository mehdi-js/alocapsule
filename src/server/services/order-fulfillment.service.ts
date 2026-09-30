import { db } from "@/lib/db";
import { UserFacingError } from "@/server/errors";

import { publishOrderEvents } from "./order-events";
import { transitionOrderStatus } from "./order-status.service";

/**
 * ارسال و تحویل سفارش توسط ادمین. ثبت کد رهگیری و انتقال به SHIPPED در یک
 * تراکنش؛ پیامک «ارسال شد» پس از commit (بند ۷.۶).
 */

export async function shipOrder(
  adminId: string,
  orderId: string,
  trackingCode: string,
): Promise<void> {
  const result = await db.$transaction(async (tx) => {
    // کد رهگیری فقط روی سفارشِ هنوز «در حال آماده‌سازی» نوشته می‌شود
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "PROCESSING" },
      data: { trackingCode },
    });
    if (count === 0) {
      throw new UserFacingError(
        "فقط سفارشِ «در حال آماده‌سازی» قابل ارسال است. صفحه را دوباره بارگذاری کنید.",
      );
    }
    return transitionOrderStatus(
      {
        orderId,
        to: "SHIPPED",
        actorUserId: adminId,
        note: `کد رهگیری: ${trackingCode}`,
      },
      tx,
    );
  });
  await publishOrderEvents(result.notifications, orderId);
}

export async function markOrderDelivered(
  adminId: string,
  orderId: string,
): Promise<void> {
  await transitionOrderStatus({
    orderId,
    to: "DELIVERED",
    actorUserId: adminId,
  });
}
