import type {
  NotificationStatus,
  NotificationType,
  OrderStatus,
} from "@prisma/client";

import { ORDER_PAGE_SIZE, type OrderFilters } from "@/lib/order-filters";
import {
  countOrdersByStatus,
  countOrdersForAdmin,
  findLatestPaymentId,
  findOrderNotifications,
  searchOrdersForAdmin,
} from "@/server/repositories/order-admin.repository";

import { getOrderDetail, type OrderDetailDto } from "./order-detail.service";

export interface AdminOrderRowDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  shippingMethodName: string;
  trackingCode: string | null;
  customerPhone: string;
  customerName: string | null;
  placedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
}

/** جدول سفارش‌ها با فیلتر وضعیت/تاریخ و جستجوی شماره یا موبایل */
export async function searchAdminOrders(filters: OrderFilters): Promise<{
  rows: AdminOrderRowDto[];
  total: number;
  pageCount: number;
  counts: Partial<Record<OrderStatus, number>>;
}> {
  const skip = (filters.page - 1) * ORDER_PAGE_SIZE;
  const [orders, total, grouped] = await Promise.all([
    searchOrdersForAdmin(filters, skip, ORDER_PAGE_SIZE),
    countOrdersForAdmin(filters),
    countOrdersByStatus(),
  ]);
  return {
    rows: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      grandTotal: order.grandTotal,
      shippingMethodName: order.shippingMethodName,
      trackingCode: order.trackingCode,
      customerPhone: order.user.phone,
      customerName: order.user.fullName,
      placedAt: order.placedAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
    })),
    total,
    pageCount: Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE)),
    counts: Object.fromEntries(
      grouped.map((group) => [group.status, group._count._all]),
    ),
  };
}

export interface AdminOrderPageDto {
  detail: OrderDetailDto;
  latestPaymentId: string | null;
  notifications: {
    id: string;
    type: NotificationType;
    status: NotificationStatus;
    attempts: number;
    errorMessage: string | null;
    createdAt: Date;
    sentAt: Date | null;
  }[];
}

export async function getAdminOrder(
  orderId: string,
): Promise<AdminOrderPageDto | null> {
  const detail = await getOrderDetail(orderId);
  if (!detail) return null;
  const [latest, notifications] = await Promise.all([
    findLatestPaymentId(orderId),
    findOrderNotifications(orderId),
  ]);
  return { detail, latestPaymentId: latest?.id ?? null, notifications };
}
