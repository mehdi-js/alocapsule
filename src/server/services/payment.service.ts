import { randomUUID } from "node:crypto";

import type { OrderStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { INVALID_IMAGE_MESSAGE } from "@/lib/image/config";
import { processReceiptImage } from "@/lib/image/process";
import { detectImageType } from "@/lib/image/sniff";
import { PAYABLE_STATUSES } from "@/lib/order-status";
import { getPrivateStorage } from "@/lib/storage/private";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  approvePendingAsWallet,
  createPayment,
  findCustomerOrder,
  markOrderPaid,
  submitPendingPayment,
} from "@/server/repositories/payment.repository";
import {
  createWalletTransaction,
  debitBalance,
} from "@/server/repositories/wallet.repository";

import { publishOrderEvents } from "./order-events";
import { transitionOrderStatus } from "./order-status.service";

/**
 * پرداخت سفارش توسط مشتری (بند ۷.۵): کارت به کارت + رسید، یا کیف پول.
 * همه‌ی تغییرات مالی در یک تراکنش و همراه AuditLog.
 */

const ORDER_NOT_FOUND = "سفارش پیدا نشد.";
const ALREADY_PAID = "این سفارش قبلاً پرداخت شده است.";
export const INSUFFICIENT_WALLET_MESSAGE =
  "موجودی کیف پول برای پرداخت این سفارش کافی نیست.";

function notPayableMessage(status: OrderStatus): string {
  if (status === "PAYMENT_REVIEW") {
    return "رسید این سفارش ثبت شده و در حال بررسی است.";
  }
  if (status === "CANCELED") return "این سفارش لغو شده است.";
  return ALREADY_PAID;
}

/** تصویر معتبر ⇒ WebP بدون متادیتا؛ فایل غیرتصویری یا خراب ⇒ خطای فارسی */
async function prepareReceipt(file: Buffer): Promise<Buffer> {
  if (!detectImageType(file)) throw new UserFacingError(INVALID_IMAGE_MESSAGE);
  try {
    return await processReceiptImage(file);
  } catch {
    throw new UserFacingError(INVALID_IMAGE_MESSAGE);
  }
}

/**
 * ثبت رسید کارت به کارت: فایل در فضای خصوصی ذخیره می‌شود، پرداخت SUBMITTED
 * و سفارش PAYMENT_REVIEW. بعد از رد رسید، یک پرداخت تازه ساخته می‌شود تا
 * سابقه‌ی رسید ردشده بماند. شکست تراکنش ⇒ فایل هم پاک می‌شود.
 */
export async function submitReceipt(params: {
  userId: string;
  orderNumber: string;
  file: Buffer;
}): Promise<void> {
  const order = await findCustomerOrder(params.orderNumber, params.userId);
  if (!order) throw new UserFacingError(ORDER_NOT_FOUND);
  if (!PAYABLE_STATUSES.includes(order.status) || order.paidAt) {
    throw new UserFacingError(notPayableMessage(order.status));
  }
  const image = await prepareReceipt(params.file);
  const key = `receipts/${randomUUID()}.webp`;
  const storage = getPrivateStorage();
  await storage.put({ key, body: image, contentType: "image/webp" });

  try {
    const submitted = await db.$transaction(async (tx) => {
      const fresh = await findCustomerOrder(
        params.orderNumber,
        params.userId,
        tx,
      );
      if (!fresh || !PAYABLE_STATUSES.includes(fresh.status)) {
        throw new UserFacingError(
          notPayableMessage(fresh?.status ?? "CANCELED"),
        );
      }
      const receipt = {
        method: "CARD_TO_CARD" as const,
        receiptImageUrl: key,
      };

      const pending = fresh.payments.find((p) => p.status === "PENDING");
      let paymentId: string;
      if (pending) {
        if (!(await submitPendingPayment(tx, pending.id, receipt))) {
          throw new UserFacingError(notPayableMessage("PAYMENT_REVIEW"));
        }
        paymentId = pending.id;
      } else {
        const created = await createPayment(tx, {
          ...receipt,
          orderId: fresh.id,
          amount: fresh.grandTotal,
          status: "SUBMITTED",
        });
        paymentId = created.id;
      }

      const transition = await transitionOrderStatus(
        { orderId: fresh.id, to: "PAYMENT_REVIEW", actorUserId: params.userId },
        tx,
      );
      await createAuditLog(tx, {
        actorUserId: params.userId,
        action: "payment.receipt_submitted",
        entityType: "Payment",
        entityId: paymentId,
        metadata: {
          orderNumber: fresh.orderNumber,
          amount: fresh.grandTotal,
        },
      });
      return { orderId: fresh.id, notifications: transition.notifications };
    });
    // پیامک مدیر (رسید جدید) پس از commit
    await publishOrderEvents(submitted.notifications, submitted.orderId);
  } catch (error) {
    await storage.delete(key);
    throw error;
  }
}

/**
 * پرداخت از کیف پول (بند ۷.۴): فقط اگر موجودی ≥ مبلغ سفارش. کسر موجودی +
 * ردیف ledger + پرداخت APPROVED + `paidAt` + انتقال به PROCESSING در یک
 * تراکنش. کلیک دوباره: `paidAt` شرطی ثبت می‌شود، پس کسر دوم رخ نمی‌دهد.
 */
export async function payWithWallet(params: {
  userId: string;
  orderNumber: string;
  now?: Date;
}): Promise<void> {
  const now = params.now ?? new Date();
  const result = await db.$transaction(async (tx) => {
    const order = await findCustomerOrder(
      params.orderNumber,
      params.userId,
      tx,
    );
    if (!order) throw new UserFacingError(ORDER_NOT_FOUND);
    if (!PAYABLE_STATUSES.includes(order.status) || order.paidAt) {
      throw new UserFacingError(notPayableMessage(order.status));
    }
    if (!(await markOrderPaid(tx, order.id, now))) {
      throw new UserFacingError(ALREADY_PAID);
    }

    const balanceAfter = await debitBalance(
      tx,
      params.userId,
      order.grandTotal,
    );
    if (balanceAfter === null) {
      throw new UserFacingError(INSUFFICIENT_WALLET_MESSAGE);
    }
    await createWalletTransaction(tx, {
      userId: params.userId,
      type: "DEBIT",
      amount: order.grandTotal,
      balanceAfter,
      reason: "ORDER_PAYMENT",
      orderId: order.id,
      createdByUserId: params.userId,
      note: null,
    });

    const pending = order.payments.find((p) => p.status === "PENDING");
    let paymentId: string;
    if (pending && (await approvePendingAsWallet(tx, pending.id, now))) {
      paymentId = pending.id;
    } else {
      const created = await createPayment(tx, {
        orderId: order.id,
        method: "WALLET",
        amount: order.grandTotal,
        status: "APPROVED",
        reviewedAt: now,
      });
      paymentId = created.id;
    }

    const transition = await transitionOrderStatus(
      { orderId: order.id, to: "PROCESSING", actorUserId: params.userId },
      tx,
    );
    await createAuditLog(tx, {
      actorUserId: params.userId,
      action: "payment.wallet_paid",
      entityType: "Payment",
      entityId: paymentId,
      metadata: {
        orderNumber: order.orderNumber,
        amount: order.grandTotal,
        balanceAfter,
      },
    });
    return { orderId: order.id, notifications: transition.notifications };
  });

  // تأیید برای مشتری + اطلاع به مدیر
  await publishOrderEvents(result.notifications, result.orderId);
}
