import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  WalletTxReason,
  WalletTxType,
} from "@prisma/client";

import { PAYABLE_STATUSES } from "@/lib/order-status";
import { findOrderForReview } from "@/server/repositories/payment.repository";

import {
  type AddressSnapshot,
  parseAddressSnapshot,
} from "./order-query.service";

/** جزئیات کامل یک سفارش برای صفحه‌های ادمین (پرداخت و سفارش) */
export interface OrderDetailDto {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    subtotal: number;
    shippingTotal: number;
    discountTotal: number;
    grandTotal: number;
    couponCode: string | null;
    shippingMethodName: string;
    shippingPayOnDelivery: boolean;
    address: AddressSnapshot | null;
    customerNote: string | null;
    placedAt: Date;
    paidAt: Date | null;
    canceledAt: Date | null;
    shippedAt: Date | null;
    trackingCode: string | null;
    items: {
      id: string;
      productName: string;
      variantTitle: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[];
  };
  customer: {
    phone: string;
    fullName: string | null;
    walletBalance: number;
  };
  /** همه‌ی پرداخت‌های همین سفارش (جدیدترین اول) */
  history: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    rejectReason: string | null;
    createdAt: Date;
  }[];
  statusHistory: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    createdAt: Date;
    actor: string | null;
    actorRole: UserRole | null;
  }[];
  walletTransactions: {
    id: string;
    type: WalletTxType;
    amount: number;
    reason: WalletTxReason;
    createdAt: Date;
  }[];
  /** لغو ممکن است (پرداخت‌شده ⇒ با بازگشت وجه به کیف پول) */
  canCancel: boolean;
}

/** لغو توسط ادمین: پرداخت‌نشده یا در حال آماده‌سازی (رسیدِ در بررسی ابتدا رد شود) */
export function canCancelOrder(status: OrderStatus): boolean {
  return PAYABLE_STATUSES.includes(status) || status === "PROCESSING";
}

export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetailDto | null> {
  const order = await findOrderForReview(orderId);
  if (!order) return null;
  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      shippingTotal: order.shippingTotal,
      discountTotal: order.discountTotal,
      grandTotal: order.grandTotal,
      couponCode: order.couponCode,
      shippingMethodName: order.shippingMethodName,
      shippingPayOnDelivery: order.shippingPayOnDelivery,
      address: parseAddressSnapshot(order.shippingAddressSnapshot),
      customerNote: order.customerNote,
      placedAt: order.placedAt,
      paidAt: order.paidAt,
      canceledAt: order.canceledAt,
      shippedAt: order.shippedAt,
      trackingCode: order.trackingCode,
      items: order.items,
    },
    customer: {
      phone: order.user.phone,
      fullName: order.user.fullName,
      walletBalance: order.user.walletBalance,
    },
    history: order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amount: p.amount,
      rejectReason: p.rejectReason,
      createdAt: p.createdAt,
    })),
    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt,
      actor: h.changedBy?.phone ?? null,
      actorRole: h.changedBy?.role ?? null,
    })),
    walletTransactions: order.walletTransactions,
    canCancel: canCancelOrder(order.status),
  };
}
