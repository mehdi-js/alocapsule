import type { Prisma } from "@prisma/client";

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { findUserOrderByNumber } from "@/server/repositories/order.repository";

export interface AddressSnapshot {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string | null;
  line: string;
}

export interface OrderConfirmationDto {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  couponCode: string | null;
  shippingMethodName: string;
  shippingPayOnDelivery: boolean;
  address: AddressSnapshot | null;
  /** سفارش تحویل حضوری (بدون آدرس) */
  pickup: boolean;
  customerNote: string | null;
  placedAt: Date;
  items: {
    id: string;
    productName: string;
    variantTitle: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
}

function readText(
  value: Prisma.JsonObject,
  key: keyof AddressSnapshot,
): string | null {
  const field = value[key];
  return typeof field === "string" ? field : null;
}

/** سفارش تحویل حضوری: اسنپ‌شات آدرس خالی (NULL) ذخیره شده است */
export function isPickupSnapshot(value: Prisma.JsonValue | null): boolean {
  return value === null;
}

/** اسنپ‌شات JSON آدرس سفارش؛ شکل نامعتبر ⇒ `null` (نمایش بدون آدرس) */
export function parseAddressSnapshot(
  value: Prisma.JsonValue,
): AddressSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receiverName = readText(value, "receiverName");
  const receiverPhone = readText(value, "receiverPhone");
  const province = readText(value, "province");
  const city = readText(value, "city");
  const line = readText(value, "line");
  if (!receiverName || !receiverPhone || !province || !city || !line) {
    return null;
  }
  return {
    receiverName,
    receiverPhone,
    province,
    city,
    postalCode: readText(value, "postalCode"),
    line,
  };
}

/** سفارش ثبت‌شده برای صفحه‌ی موفقیت؛ سفارش کاربر دیگر ⇒ `null` */
export async function getOrderConfirmation(
  orderNumber: string,
  userId: string,
): Promise<OrderConfirmationDto | null> {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) return null;
  const order = await findUserOrderByNumber(orderNumber, userId);
  if (!order) return null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    subtotal: order.subtotal,
    shippingTotal: order.shippingTotal,
    discountTotal: order.discountTotal,
    grandTotal: order.grandTotal,
    couponCode: order.couponCode,
    shippingMethodName: order.shippingMethodName,
    shippingPayOnDelivery: order.shippingPayOnDelivery,
    address: parseAddressSnapshot(order.shippingAddressSnapshot),
    pickup: isPickupSnapshot(order.shippingAddressSnapshot),
    customerNote: order.customerNote,
    placedAt: order.placedAt,
    items: order.items,
  };
}
