import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

import {
  countPaymentsByStatus,
  findPaymentForReview,
  listPayments,
} from "@/server/repositories/payment.repository";

import { getOrderDetail, type OrderDetailDto } from "./order-detail.service";

/** خواندن صف و جزئیات پرداخت برای ادمین (بدون تغییر داده) */

export type PaymentFilter = "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL";

export interface PaymentRowDto {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  customerPhone: string;
  customerName: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  referenceNumber: string | null;
  createdAt: Date;
}

export async function listPaymentQueue(
  filter: PaymentFilter,
): Promise<{ rows: PaymentRowDto[]; counts: Record<PaymentStatus, number> }> {
  const [payments, grouped] = await Promise.all([
    listPayments(filter === "ALL" ? null : filter),
    countPaymentsByStatus(),
  ]);
  const counts: Record<PaymentStatus, number> = {
    PENDING: 0,
    SUBMITTED: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  for (const group of grouped) counts[group.status] = group._count._all;

  return {
    rows: payments.map((payment) => ({
      id: payment.id,
      orderNumber: payment.order.orderNumber,
      orderStatus: payment.order.status,
      customerPhone: payment.order.user.phone,
      customerName: payment.order.user.fullName,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      referenceNumber: payment.referenceNumber,
      createdAt: payment.createdAt,
    })),
    counts,
  };
}

export interface PaymentReviewDto extends OrderDetailDto {
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    referenceNumber: string | null;
    payerCardLast4: string | null;
    paidAtClaimed: Date | null;
    rejectReason: string | null;
    hasReceipt: boolean;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewer: string | null;
  };
}

export async function getPaymentReview(
  paymentId: string,
): Promise<PaymentReviewDto | null> {
  const payment = await findPaymentForReview(paymentId);
  if (!payment) return null;
  const detail = await getOrderDetail(payment.orderId);
  if (!detail) return null;

  return {
    ...detail,
    payment: {
      id: payment.id,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      referenceNumber: payment.referenceNumber,
      payerCardLast4: payment.payerCardLast4,
      paidAtClaimed: payment.paidAtClaimed,
      rejectReason: payment.rejectReason,
      hasReceipt: payment.receiptImageUrl !== null,
      createdAt: payment.createdAt,
      reviewedAt: payment.reviewedAt,
      reviewer: payment.reviewedBy
        ? (payment.reviewedBy.fullName ?? payment.reviewedBy.phone)
        : null,
    },
  };
}
