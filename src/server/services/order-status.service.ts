import type { OrderStatus } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";
import {
  canTransition,
  notificationsForTransition,
  ORDER_STATUS_LABELS,
  type OrderNotificationType,
} from "@/lib/order-status";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  createStatusHistory,
  findOrderStatus,
  releaseOrderCoupon,
  updateOrderStatusIf,
} from "@/server/repositories/order-status.repository";
import {
  createWalletTransaction,
  creditBalance,
} from "@/server/repositories/wallet.repository";

import { publishOrderEvents } from "./order-events";

export interface TransitionParams {
  orderId: string;
  to: OrderStatus;
  /** کاربری که تغییر را انجام داد (ادمین یا خود مشتری)؛ `null` برای job */
  actorUserId: string | null;
  note?: string | null;
}

export interface TransitionResult {
  from: OrderStatus;
  to: OrderStatus;
  /** رویداد اعلانی که باید پس از commit منتشر شود */
  notifications: OrderNotificationType[];
  /** مبلغ بازگشته به کیف پول (لغو سفارش پرداخت‌شده) */
  refundedAmount: number;
}

async function applyTransition(
  tx: DbClient,
  params: TransitionParams,
): Promise<TransitionResult> {
  const order = await findOrderStatus(tx, params.orderId);
  if (!order) throw new UserFacingError("سفارش پیدا نشد.");

  const from = order.status;
  if (!canTransition(from, params.to)) {
    throw new UserFacingError(
      `تغییر وضعیت سفارش از «${ORDER_STATUS_LABELS[from]}» به «${ORDER_STATUS_LABELS[params.to]}» مجاز نیست.`,
    );
  }
  // آماده‌سازی فقط پس از پرداخت تأییدشده (رسید یا کیف پول)؛ `paidAt` را
  // سرویس پرداخت در همان تراکنش، پیش از این انتقال ثبت می‌کند
  if (params.to === "PROCESSING" && !order.paidAt) {
    throw new UserFacingError(
      "بدون پرداخت تأییدشده، سفارش به آماده‌سازی نمی‌رود.",
    );
  }
  const refund = params.to === "CANCELED" && order.paidAt !== null;
  if (refund && !params.actorUserId) {
    throw new UserFacingError("لغو سفارش پرداخت‌شده فقط توسط ادمین ممکن است.");
  }

  const updated = await updateOrderStatusIf(
    tx,
    params.orderId,
    from,
    params.to,
    new Date(),
  );
  if (!updated) {
    throw new UserFacingError(
      "وضعیت این سفارش هم‌زمان تغییر کرده است. صفحه را دوباره بارگذاری کنید.",
    );
  }

  await createStatusHistory(tx, {
    orderId: params.orderId,
    fromStatus: from,
    toStatus: params.to,
    changedByUserId: params.actorUserId,
    note: params.note ?? null,
  });

  // لغو ⇒ کد تخفیف آزاد می‌شود (بند ۷.۳)؛ رد رسید کد را آزاد نمی‌کند
  if (params.to === "CANCELED") await releaseOrderCoupon(tx, params.orderId);

  // لغو سفارش پرداخت‌شده ⇒ کل مبلغ به کیف پول برمی‌گردد (بند ۷.۴: ledger + کش در یک تراکنش)
  if (refund && params.actorUserId) {
    const balanceAfter = await creditBalance(
      tx,
      order.userId,
      order.grandTotal,
    );
    await createWalletTransaction(tx, {
      userId: order.userId,
      type: "CREDIT",
      amount: order.grandTotal,
      balanceAfter,
      reason: "ORDER_REFUND",
      orderId: params.orderId,
      createdByUserId: params.actorUserId,
      note: params.note ?? null,
    });
    await createAuditLog(tx, {
      actorUserId: params.actorUserId,
      action: "order.refunded_to_wallet",
      entityType: "Order",
      entityId: params.orderId,
      metadata: {
        orderNumber: order.orderNumber,
        amount: order.grandTotal,
        balanceAfter,
        reason: params.note ?? null,
      },
    });
  }

  return {
    from,
    to: params.to,
    notifications: notificationsForTransition(from, params.to),
    refundedAmount: refund ? order.grandTotal : 0,
  };
}

/**
 * تابع مرکزی تغییر وضعیت سفارش (بند ۷.۷): فقط انتقال‌های مجاز، هر انتقال یک
 * ردیف `OrderStatusHistory`.
 *
 * - بدون `tx`: تراکنش خودش را دارد و رویداد اعلان را پس از commit منتشر می‌کند.
 * - با `tx` (داخل تراکنش بزرگ‌تر، مثل تأیید پرداخت): انتشار رویداد پس از commit
 *   بر عهده‌ی فراخواننده است (`result.notifications`).
 */
export async function transitionOrderStatus(
  params: TransitionParams,
  tx?: DbClient,
): Promise<TransitionResult> {
  if (tx) return applyTransition(tx, params);

  const result = await db.$transaction((client) =>
    applyTransition(client, params),
  );
  await publishOrderEvents(result.notifications, params.orderId);
  return result;
}
