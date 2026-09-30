import type { OrderStatus } from "@prisma/client";

import type { DbClient } from "@/lib/db";

export function findOrderStatus(tx: DbClient, orderId: string) {
  return tx.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      paidAt: true,
      grandTotal: true,
      userId: true,
      orderNumber: true,
    },
  });
}

/**
 * تغییر وضعیت فقط اگر وضعیت هنوز همان `from` باشد (جلوی دو تغییر هم‌زمان را
 * می‌گیرد، بدون قفل صریح). خروجی: آیا تغییر اعمال شد.
 */
export async function updateOrderStatusIf(
  tx: DbClient,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  now: Date,
): Promise<boolean> {
  const { count } = await tx.order.updateMany({
    where: { id: orderId, status: from },
    data: {
      status: to,
      ...(to === "SHIPPED" ? { shippedAt: now } : {}),
      ...(to === "CANCELED" ? { canceledAt: now } : {}),
    },
  });
  return count > 0;
}

export function createStatusHistory(
  tx: DbClient,
  data: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedByUserId: string | null;
    note: string | null;
  },
) {
  return tx.orderStatusHistory.create({ data });
}

/** آزادسازی کد تخفیف سفارش لغوشده: حذف redemption و کم کردن `usedCount` */
export async function releaseOrderCoupon(
  tx: DbClient,
  orderId: string,
): Promise<number> {
  const redemptions = await tx.couponRedemption.findMany({
    where: { orderId },
    select: { id: true, couponId: true },
  });
  for (const redemption of redemptions) {
    await tx.couponRedemption.delete({ where: { id: redemption.id } });
    await tx.$executeRaw`
      UPDATE "Coupon"
      SET "usedCount" = GREATEST("usedCount" - 1, 0)
      WHERE "id" = ${redemption.couponId}
    `;
  }
  return redemptions.length;
}
