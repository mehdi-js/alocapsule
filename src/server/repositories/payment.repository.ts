import type { PaymentStatus, Prisma } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";

/**
 * پرداخت‌ها. تغییر وضعیت پرداخت همیشه شرطی است (`where status = …`) تا
 * کلیک دوباره یا درخواست هم‌زمان اثر مالی دوباره نداشته باشد.
 */

const paymentSummary = {
  id: true,
  method: true,
  status: true,
  amount: true,
  referenceNumber: true,
  payerCardLast4: true,
  paidAtClaimed: true,
  rejectReason: true,
  receiptImageUrl: true,
  reviewedAt: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

/** سفارش مشتری برای صفحه‌ی پرداخت (فقط سفارش خود کاربر) */
export function findCustomerOrder(
  orderNumber: string,
  userId: string,
  client: DbClient = db,
) {
  return client.order.findFirst({
    where: { orderNumber, userId },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      grandTotal: true,
      placedAt: true,
      paidAt: true,
      payments: { orderBy: { createdAt: "desc" }, select: paymentSummary },
    },
  });
}

/** ثبت رسید روی پرداختِ در انتظار (اولین رسید سفارش) */
export async function submitPendingPayment(
  tx: DbClient,
  paymentId: string,
  data: Prisma.PaymentUpdateManyMutationInput,
): Promise<boolean> {
  const { count } = await tx.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { ...data, status: "SUBMITTED" },
  });
  return count > 0;
}

export function createPayment(
  tx: DbClient,
  data: Prisma.PaymentUncheckedCreateInput,
) {
  return tx.payment.create({ data, select: { id: true } });
}

/** پرداخت در انتظار ⇒ کیف پول، تأییدشده */
export async function approvePendingAsWallet(
  tx: DbClient,
  paymentId: string,
  now: Date,
): Promise<boolean> {
  const { count } = await tx.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { method: "WALLET", status: "APPROVED", reviewedAt: now },
  });
  return count > 0;
}

/** بررسی ادمین: فقط پرداختی که هنوز SUBMITTED است تغییر می‌کند */
export async function reviewSubmittedPayment(
  tx: DbClient,
  paymentId: string,
  data: {
    status: Extract<PaymentStatus, "APPROVED" | "REJECTED">;
    reviewedByUserId: string;
    reviewedAt: Date;
    rejectReason: string | null;
  },
): Promise<boolean> {
  const { count } = await tx.payment.updateMany({
    where: { id: paymentId, status: "SUBMITTED" },
    data,
  });
  return count > 0;
}

/** ثبت `paidAt` فقط یک‌بار (سفارش پرداخت‌نشده) */
export async function markOrderPaid(
  tx: DbClient,
  orderId: string,
  now: Date,
): Promise<boolean> {
  const { count } = await tx.order.updateMany({
    where: { id: orderId, paidAt: null },
    data: { paidAt: now },
  });
  return count > 0;
}

export function findPaymentForReview(id: string, client: DbClient = db) {
  return client.payment.findUnique({
    where: { id },
    select: {
      ...paymentSummary,
      orderId: true,
      reviewedBy: { select: { phone: true, fullName: true } },
    },
  });
}

/** جزئیات کامل برای صفحه‌ی بررسی ادمین */
export function findOrderForReview(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      grandTotal: true,
      couponCode: true,
      shippingMethodName: true,
      shippingPayOnDelivery: true,
      shippingAddressSnapshot: true,
      serviceTermsAcceptedAt: true,
      serviceTermsSnapshot: true,
      customerNote: true,
      placedAt: true,
      paidAt: true,
      canceledAt: true,
      shippedAt: true,
      trackingCode: true,
      user: {
        select: { id: true, phone: true, fullName: true, walletBalance: true },
      },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productName: true,
          variantTitle: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
          productKindSnapshot: true,
        },
      },
      payments: { orderBy: { createdAt: "desc" }, select: paymentSummary },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          changedBy: { select: { phone: true, role: true } },
        },
      },
      walletTransactions: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          amount: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  });
}

export function listPayments(status: PaymentStatus | null, take = 100) {
  return db.payment.findMany({
    where: status ? { status } : { status: { not: "PENDING" } },
    // صف بررسی: قدیمی‌ترین رسید اول؛ بقیه: جدیدترین اول
    orderBy: { createdAt: status === "SUBMITTED" ? "asc" : "desc" },
    take,
    select: {
      ...paymentSummary,
      order: {
        select: {
          orderNumber: true,
          status: true,
          user: { select: { phone: true, fullName: true } },
        },
      },
    },
  });
}

export function countPaymentsByStatus() {
  return db.payment.groupBy({ by: ["status"], _count: { _all: true } });
}

/** برای سرو امن تصویر رسید: کلید فایل + صاحب سفارش */
export function findReceiptAccess(paymentId: string) {
  return db.payment.findUnique({
    where: { id: paymentId },
    select: { receiptImageUrl: true, order: { select: { userId: true } } },
  });
}
