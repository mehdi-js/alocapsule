import { cn } from "@/lib/utils";
import type { CouponStatus } from "@/server/services/coupon-admin.service";

const STATUS: Record<CouponStatus, { label: string; className: string }> = {
  active: { label: "فعال", className: "bg-emerald-50 text-emerald-700" },
  scheduled: { label: "زمان‌بندی‌شده", className: "bg-sky-50 text-sky-700" },
  expired: { label: "منقضی", className: "bg-neutral-100 text-neutral-600" },
  exhausted: { label: "تکمیل ظرفیت", className: "bg-amber-50 text-amber-700" },
  inactive: { label: "غیرفعال", className: "bg-neutral-100 text-neutral-600" },
};

export function CouponStatusBadge({ status }: { status: CouponStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}
