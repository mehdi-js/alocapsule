import type { PaymentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  findPaymentForReview,
  markOrderPaid,
  reviewSubmittedPayment,
} from "@/server/repositories/payment.repository";

import { canCancelOrder } from "./order-detail.service";
import { publishOrderEvents } from "./order-events";
import { transitionOrderStatus } from "./order-status.service";

/**
 * بررسی پرداخت توسط ادمین (بند ۷.۵). تأیید/رد **idempotent** است: فقط پرداختی
 * که هنوز SUBMITTED است تغییر می‌کند؛ کلیک دوباره یا هم‌زمان هیچ اثر مالی،
 * انتقال وضعیت یا رویداد دوباره‌ای ندارد.
 */

export interface ReviewOutcome {
  /** `false` یعنی قبلاً بررسی شده بود و این درخواست اثری نداشت */
  changed: boolean;
  message: string;
}

const STATUS_DONE_MESSAGES: Record<PaymentStatus, string> = {
  PENDING: "برای این پرداخت هنوز رسیدی ثبت نشده است.",
  SUBMITTED: "این پرداخت در انتظار بررسی است.",
  APPROVED: "این پرداخت قبلاً تأیید شده است.",
  REJECTED: "این پرداخت قبلاً رد شده است.",
};

async function reviewPayment(params: {
  adminId: string;
  paymentId: string;
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
}): Promise<ReviewOutcome> {
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const payment = await findPaymentForReview(params.paymentId, tx);
    if (!payment) throw new UserFacingError("پرداخت پیدا نشد.");
    if (payment.status !== "SUBMITTED") {
      return { changed: false as const, status: payment.status };
    }

    const reviewed = await reviewSubmittedPayment(tx, payment.id, {
      status: params.decision,
      reviewedByUserId: params.adminId,
      reviewedAt: now,
      rejectReason: params.reason,
    });
    // درخواست هم‌زمانِ دیگری زودتر بررسی کرد
    if (!reviewed) {
      const current = await findPaymentForReview(params.paymentId, tx);
      return {
        changed: false as const,
        status: current?.status ?? "SUBMITTED",
      };
    }

    if (params.decision === "APPROVED") {
      if (!(await markOrderPaid(tx, payment.orderId, now))) {
        throw new UserFacingError("این سفارش قبلاً پرداخت شده است.");
      }
    }
    const transition = await transitionOrderStatus(
      {
        orderId: payment.orderId,
        to: params.decision === "APPROVED" ? "PROCESSING" : "PAYMENT_REJECTED",
        actorUserId: params.adminId,
        note: params.reason,
      },
      tx,
    );
    await createAuditLog(tx, {
      actorUserId: params.adminId,
      action:
        params.decision === "APPROVED"
          ? "payment.approved"
          : "payment.rejected",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        orderId: payment.orderId,
        amount: payment.amount,
        referenceNumber: payment.referenceNumber,
        reason: params.reason,
      },
    });
    return {
      changed: true as const,
      orderId: payment.orderId,
      notifications: transition.notifications,
    };
  });

  if (!result.changed) {
    return { changed: false, message: STATUS_DONE_MESSAGES[result.status] };
  }
  await publishOrderEvents(result.notifications, result.orderId);
  return {
    changed: true,
    message:
      params.decision === "APPROVED"
        ? "پرداخت تأیید شد و سفارش به آماده‌سازی رفت."
        : "رسید رد شد؛ مشتری می‌تواند رسید جدید بفرستد.",
  };
}

export function approvePayment(
  adminId: string,
  paymentId: string,
): Promise<ReviewOutcome> {
  return reviewPayment({
    adminId,
    paymentId,
    decision: "APPROVED",
    reason: null,
  });
}

export function rejectPayment(
  adminId: string,
  paymentId: string,
  reason: string,
): Promise<ReviewOutcome> {
  return reviewPayment({ adminId, paymentId, decision: "REJECTED", reason });
}

/**
 * لغو سفارش توسط ادمین. سفارش پرداخت‌شده ⇒ کل مبلغ به کیف پول مشتری
 * برمی‌گردد و کد تخفیف آزاد می‌شود (هر دو در `transitionOrderStatus`).
 * لغو دوباره اثری ندارد.
 */
export async function cancelOrderByAdmin(
  adminId: string,
  orderId: string,
  reason: string,
): Promise<ReviewOutcome> {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, orderNumber: true },
    });
    if (!order) throw new UserFacingError("سفارش پیدا نشد.");
    if (order.status === "CANCELED") return null;
    if (!canCancelOrder(order.status)) {
      throw new UserFacingError(
        order.status === "PAYMENT_REVIEW"
          ? "رسید این سفارش در انتظار بررسی است؛ ابتدا آن را تأیید یا رد کنید."
          : "این سفارش دیگر قابل لغو نیست.",
      );
    }
    const transition = await transitionOrderStatus(
      { orderId, to: "CANCELED", actorUserId: adminId, note: reason },
      tx,
    );
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: "order.canceled",
      entityType: "Order",
      entityId: orderId,
      metadata: {
        orderNumber: order.orderNumber,
        fromStatus: transition.from,
        refundedAmount: transition.refundedAmount,
        reason,
      },
    });
    return transition;
  });

  if (!result) {
    return { changed: false, message: "این سفارش قبلاً لغو شده است." };
  }
  await publishOrderEvents(result.notifications, orderId);
  return {
    changed: true,
    message:
      result.refundedAmount > 0
        ? "سفارش لغو شد و مبلغ آن به کیف پول مشتری برگشت."
        : "سفارش لغو شد.",
  };
}
