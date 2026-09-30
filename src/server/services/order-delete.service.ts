import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPrivateStorage } from "@/lib/storage/private";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";

/**
 * حذف دائمی سفارش یا پرداخت توسط ادمین (به ندرت؛ مثلاً سفارش آزمایشی).
 *
 * قواعد یکپارچگی مالی:
 * - تراکنش‌های کیف پول **حذف نمی‌شوند** (پولی که جابه‌جا شده واقعی است؛
 *   فقط ارتباطشان با سفارش قطع می‌شود). برای بازگشت پول، اول سفارش لغو شود.
 * - مصرف کد تخفیف همان سفارش آزاد و `usedCount` کم می‌شود.
 * - اقلام، پرداخت‌ها، تاریخچه‌ی وضعیت و redemption با cascade حذف می‌شوند؛
 *   لاگ پیامک‌ها می‌مانند (بدون سفارش).
 * - خلاصه‌ی سفارش در AuditLog می‌ماند و شماره‌اش دوباره استفاده نمی‌شود.
 * - فایل رسیدها پس از commit از فضای خصوصی پاک می‌شوند.
 */

async function deleteReceiptFiles(keys: string[]): Promise<void> {
  const storage = getPrivateStorage();
  await Promise.all(
    keys.map((key) =>
      storage.delete(key).catch((error: unknown) => {
        logger.error("receipt_delete_failed", error, { key });
      }),
    ),
  );
}

export async function deleteOrder(
  adminId: string,
  orderId: string,
  confirmOrderNumber: string,
): Promise<{ orderNumber: string }> {
  const receipts = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { phone: true } },
        payments: {
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            receiptImageUrl: true,
          },
        },
        couponRedemptions: { select: { couponId: true } },
        walletTransactions: { select: { id: true } },
      },
    });
    if (!order)
      throw new UserFacingError("سفارش پیدا نشد (شاید قبلاً حذف شده).");
    if (order.orderNumber !== confirmOrderNumber.trim()) {
      throw new UserFacingError("شماره‌ی سفارش واردشده با این سفارش یکی نیست.");
    }

    for (const { couponId } of order.couponRedemptions) {
      await tx.coupon.updateMany({
        where: { id: couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: "order.deleted",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        customerPhone: order.user.phone,
        status: order.status,
        grandTotal: order.grandTotal,
        paidAt: order.paidAt?.toISOString() ?? null,
        placedAt: order.placedAt.toISOString(),
        couponCode: order.couponCode,
        payments: order.payments.map((p) => ({
          method: p.method,
          status: p.status,
          amount: p.amount,
        })),
        keptWalletTransactions: order.walletTransactions.length,
      },
    });
    await tx.order.delete({ where: { id: order.id } });
    return {
      orderNumber: order.orderNumber,
      keys: order.payments.flatMap((p) =>
        p.receiptImageUrl ? [p.receiptImageUrl] : [],
      ),
    };
  });
  await deleteReceiptFiles(receipts.keys);
  return { orderNumber: receipts.orderNumber };
}

/** پرداختی که با وضعیت سفارش گره خورده (تأییدشده یا در حال بررسی) جدا حذف نمی‌شود */
const DELETABLE_PAYMENT_STATUSES = ["PENDING", "REJECTED"] as const;

export function canDeletePayment(status: string): boolean {
  return (DELETABLE_PAYMENT_STATUSES as readonly string[]).includes(status);
}

export async function deletePayment(
  adminId: string,
  paymentId: string,
): Promise<{ orderId: string }> {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: { select: { id: true, orderNumber: true } } },
    });
    if (!payment)
      throw new UserFacingError("پرداخت پیدا نشد (شاید قبلاً حذف شده).");
    if (!canDeletePayment(payment.status)) {
      throw new UserFacingError(
        payment.status === "APPROVED"
          ? "پرداخت تأییدشده جدا حذف نمی‌شود؛ برای حذفش خود سفارش را حذف کنید."
          : "این رسید در انتظار بررسی است؛ اول آن را رد یا تأیید کنید.",
      );
    }
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: "payment.deleted",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        orderNumber: payment.order.orderNumber,
        method: payment.method,
        status: payment.status,
        amount: payment.amount,
        rejectReason: payment.rejectReason,
      },
    });
    await tx.payment.delete({ where: { id: payment.id } });
    return { orderId: payment.order.id, key: payment.receiptImageUrl };
  });
  if (result.key) await deleteReceiptFiles([result.key]);
  return { orderId: result.orderId };
}
