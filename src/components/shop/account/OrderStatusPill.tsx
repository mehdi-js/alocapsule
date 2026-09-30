import type { OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const TONES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-gold/40 text-gold",
  PAYMENT_REVIEW: "border-gold/40 text-gold",
  PAYMENT_REJECTED: "border-danger/40 text-danger",
  PROCESSING: "border-action/40 text-action",
  SHIPPED: "border-action/40 text-action",
  DELIVERED: "border-action/40 text-action",
  CANCELED: "border-[rgb(201_168_118/0.25)] text-muted",
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
