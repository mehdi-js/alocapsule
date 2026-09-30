import type { OrderStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export interface OrderQuery {
  status: OrderStatus | null;
  from: Date | null;
  to: Date | null;
  /** شماره‌ی سفارش یا موبایل (ارقام لاتین) */
  q: string;
}

function orderWhere(query: OrderQuery): Prisma.OrderWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          placedAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lt: query.to } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q.toUpperCase() } },
            { user: { phone: { contains: query.q } } },
          ],
        }
      : {}),
  };
}

function orderSort(
  status: OrderStatus | null,
): Prisma.OrderOrderByWithRelationInput {
  // صف ارسال: قدیمی‌ترین پرداخت اول؛ بقیه جدیدترین سفارش اول
  return status === "PROCESSING" ? { paidAt: "asc" } : { placedAt: "desc" };
}

export function searchOrdersForAdmin(
  query: OrderQuery,
  skip: number,
  take: number,
) {
  return db.order.findMany({
    where: orderWhere(query),
    orderBy: orderSort(query.status),
    skip,
    take,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      shippingMethodName: true,
      shippingPayOnDelivery: true,
      trackingCode: true,
      placedAt: true,
      paidAt: true,
      shippedAt: true,
      user: { select: { phone: true, fullName: true } },
    },
  });
}

export function countOrdersForAdmin(query: OrderQuery) {
  return db.order.count({ where: orderWhere(query) });
}

/** همه‌ی ستون‌های خروجی CSV (حداکثر `take` ردیف) */
export function findOrdersForExport(query: OrderQuery, take: number) {
  return db.order.findMany({
    where: orderWhere(query),
    orderBy: orderSort(query.status),
    take,
    select: {
      orderNumber: true,
      status: true,
      placedAt: true,
      paidAt: true,
      shippedAt: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      grandTotal: true,
      couponCode: true,
      shippingMethodName: true,
      shippingPayOnDelivery: true,
      shippingAddressSnapshot: true,
      trackingCode: true,
      user: { select: { phone: true, fullName: true } },
      _count: { select: { items: true } },
    },
  });
}

export function countOrdersByStatus() {
  return db.order.groupBy({ by: ["status"], _count: { _all: true } });
}

/** آخرین پرداخت سفارش (لینک به صفحه‌ی بررسی) */
export function findLatestPaymentId(orderId: string) {
  return db.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

export function findOrderNotifications(orderId: string) {
  return db.notificationLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      attempts: true,
      errorMessage: true,
      createdAt: true,
      sentAt: true,
    },
  });
}
