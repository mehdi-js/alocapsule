/**
 * وضعیت سفارش و انتقال‌های مجاز (بند ۷.۷ سند). خالص، تا هم سرور و هم UI
 * از یک جدول استفاده کنند.
 */

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAYMENT_REJECTED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

export type OrderNotificationType =
  | "ORDER_PLACED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "ORDER_SHIPPED"
  | "ORDER_CANCELED"
  | "ADMIN_RECEIPT_SUBMITTED"
  | "ADMIN_WALLET_PAID";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAYMENT_REVIEW: "در حال بررسی پرداخت",
  PAYMENT_REJECTED: "رسید تأیید نشد",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  CANCELED: "لغو شد",
};

/**
 * جدول بند ۷.۷ + انتقال مستقیم به PROCESSING از PENDING_PAYMENT و
 * PAYMENT_REJECTED که فقط برای پرداخت از کیف پول (تأیید فوری) است. ورود به
 * PROCESSING همیشه به پرداخت تأییدشده (`paidAt`) نیاز دارد.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_REVIEW", "PROCESSING", "CANCELED"],
  PAYMENT_REVIEW: ["PROCESSING", "PAYMENT_REJECTED"],
  PAYMENT_REJECTED: ["PAYMENT_REVIEW", "PROCESSING", "CANCELED"],
  PROCESSING: ["SHIPPED", "CANCELED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** پیامک‌هایی که هر انتقال باید پس از commit بفرستد (بند ۷.۶) */
export function notificationsForTransition(
  from: OrderStatus,
  to: OrderStatus,
): OrderNotificationType[] {
  switch (to) {
    // ورود مستقیم به آماده‌سازی (نه از «بررسی پرداخت») فقط با کیف پول است
    case "PROCESSING":
      return from === "PAYMENT_REVIEW"
        ? ["PAYMENT_APPROVED"]
        : ["PAYMENT_APPROVED", "ADMIN_WALLET_PAID"];
    case "PAYMENT_REVIEW":
      return ["ADMIN_RECEIPT_SUBMITTED"];
    case "PAYMENT_REJECTED":
      return ["PAYMENT_REJECTED"];
    case "SHIPPED":
      return ["ORDER_SHIPPED"];
    case "CANCELED":
      return ["ORDER_CANCELED"];
    default:
      return [];
  }
}

/** سفارشی که مشتری می‌تواند برایش پرداخت کند (رسید یا کیف پول) */
export const PAYABLE_STATUSES: readonly OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_REJECTED",
];
