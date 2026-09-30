import type { OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const TONES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-accent/40 text-accent",
  PAYMENT_REVIEW: "border-accent/40 text-accent",
  PAYMENT_REJECTED: "border-danger/40 text-danger",
  PROCESSING: "border-brand-strong/40 text-brand-strong",
  SHIPPED: "border-brand-strong/40 text-brand-strong",
  DELIVERED: "border-brand-strong/40 text-brand-strong",
  CANCELED: "border-control text-muted",
};

export function OrderStatusPill({
  status,
  label,
}: {
  status: OrderStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap",
        TONES[status],
      )}
    >
      {label}
    </span>
  );
}
