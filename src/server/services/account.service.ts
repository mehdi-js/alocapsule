import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  WalletTxReason,
  WalletTxType,
} from "@prisma/client";

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";
import { ORDER_STATUS_LABELS, PAYABLE_STATUSES } from "@/lib/order-status";
import type { ProfileInput } from "@/lib/validation/user";
import { UserFacingError } from "@/server/errors";
import {
  findProfile,
  findUserOrderDetail,
  listUserOrders,
  listUserWalletTransactions,
  updateProfileRecord,
} from "@/server/repositories/account.repository";

import {
  type AddressSnapshot,
  isPickupSnapshot,
  parseAddressSnapshot,
} from "./order-query.service";
import { transitionOrderStatus } from "./order-status.service";

/**
 * پنل کاربر. 🔴 هر خواندن و تغییری به `userId` کاربر واردشده محدود است؛
 * سفارش کاربر دیگر مثل سفارش ناموجود رفتار می‌کند (`null` / «پیدا نشد»).
 */

/** مشتری فقط سفارش پرداخت‌نشده را لغو می‌کند (در انتظار پرداخت یا رسید ردشده) */
export const CUSTOMER_CANCELABLE: readonly OrderStatus[] = PAYABLE_STATUSES;

export interface MyOrderRowDto {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  grandTotal: number;
  placedAt: Date;
  itemsSummary: string;
  itemCount: number;
}

export async function listMyOrders(userId: string): Promise<MyOrderRowDto[]> {
  const orders = await listUserOrders(userId);
  return orders.map((order) => ({
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    grandTotal: order.grandTotal,
    placedAt: order.placedAt,
    itemsSummary: order.items.map((item) => item.productName).join("، "),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export interface MyOrderDto {
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
  trackingCode: string | null;
  placedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  canceledAt: Date | null;
  items: {
    id: string;
    productName: string;
    variantTitle: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  timeline: { id: string; status: OrderStatus; label: string; at: Date }[];
  lastPayment: {
    method: PaymentMethod;
    status: PaymentStatus;
    rejectReason: string | null;
  } | null;
  /** رسید/کیف پول: لینک صفحه‌ی پرداخت */
  canPay: boolean;
  canCancel: boolean;
}

export async function getMyOrder(
  orderNumber: string,
  userId: string,
): Promise<MyOrderDto | null> {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) return null;
  const order = await findUserOrderDetail(orderNumber, userId);
  if (!order) return null;
  const payable = PAYABLE_STATUSES.includes(order.status) && !order.paidAt;
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
    trackingCode: order.trackingCode,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    canceledAt: order.canceledAt,
    items: order.items,
    timeline: order.statusHistory.map((entry) => ({
      id: entry.id,
      status: entry.toStatus,
      label: ORDER_STATUS_LABELS[entry.toStatus],
      at: entry.createdAt,
    })),
    lastPayment: order.payments[0] ?? null,
    canPay: payable,
    canCancel: payable && CUSTOMER_CANCELABLE.includes(order.status),
  };
}

/**
 * لغو سفارش توسط خود مشتری (فقط پرداخت‌نشده). کد تخفیف در
 * `transitionOrderStatus` آزاد می‌شود؛ سفارش پرداخت‌نشده بازگشت وجهی ندارد.
 */
export async function cancelMyOrder(
  userId: string,
  orderNumber: string,
): Promise<void> {
  const order = ORDER_NUMBER_PATTERN.test(orderNumber)
    ? await findUserOrderDetail(orderNumber, userId)
    : null;
  if (!order) throw new UserFacingError("سفارش پیدا نشد.");
  if (order.status === "CANCELED") return;
  if (!CUSTOMER_CANCELABLE.includes(order.status) || order.paidAt) {
    throw new UserFacingError(
      order.status === "PAYMENT_REVIEW"
        ? "رسید این سفارش در حال بررسی است و فعلاً قابل لغو نیست؛ برای لغو با پشتیبانی تماس بگیرید."
        : "این سفارش دیگر قابل لغو نیست؛ برای لغو با پشتیبانی تماس بگیرید.",
    );
  }
  await transitionOrderStatus({
    orderId: order.id,
    to: "CANCELED",
    actorUserId: userId,
    note: "لغو توسط مشتری",
  });
}

export interface WalletHistoryDto {
  balance: number;
  transactions: {
    id: string;
    type: WalletTxType;
    reason: WalletTxReason;
    amount: number;
    balanceAfter: number;
    orderNumber: string | null;
    createdAt: Date;
  }[];
}

/** تاریخچه‌ی کیف پول؛ یادداشت داخلی ادمین به مشتری نمایش داده نمی‌شود */
export async function getMyWallet(userId: string): Promise<WalletHistoryDto> {
  const [profile, transactions] = await Promise.all([
    findProfile(userId),
    listUserWalletTransactions(userId),
  ]);
  return {
    balance: profile?.walletBalance ?? 0,
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      reason: tx.reason,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      orderNumber: tx.order?.orderNumber ?? null,
      createdAt: tx.createdAt,
    })),
  };
}

export interface ProfileDto {
  phone: string;
  fullName: string | null;
  email: string | null;
}

export async function getProfile(userId: string): Promise<ProfileDto | null> {
  const profile = await findProfile(userId);
  return profile
    ? { phone: profile.phone, fullName: profile.fullName, email: profile.email }
    : null;
}

export async function updateProfile(
  userId: string,
  input: ProfileInput,
): Promise<void> {
  await updateProfileRecord(userId, input);
}
