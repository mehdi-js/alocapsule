import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/payment";
import { cn } from "@/lib/utils";

const badge = "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";

const PAYMENT_TONES: Record<PaymentStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-600",
  SUBMITTED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

const ORDER_TONES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-neutral-100 text-neutral-600",
  PAYMENT_REVIEW: "bg-amber-50 text-amber-700",
  PAYMENT_REJECTED: "bg-red-50 text-red-700",
  PROCESSING: "bg-sky-50 text-sky-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn(badge, PAYMENT_TONES[status])}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn(badge, ORDER_TONES[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

const NOTIFICATION_TONES = {
  PENDING: "bg-amber-50 text-amber-700",
  SENT: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
} as const;

const NOTIFICATION_LABELS = {
  PENDING: "در انتظار ارسال",
  SENT: "ارسال شد",
  FAILED: "ناموفق",
} as const;

export function NotificationStatusBadge({
  status,
}: {
  status: keyof typeof NOTIFICATION_TONES;
}) {
  return (
    <span className={cn(badge, NOTIFICATION_TONES[status])}>
      {NOTIFICATION_LABELS[status]}
    </span>
  );
}
