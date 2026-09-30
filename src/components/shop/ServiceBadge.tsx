import { cn } from "@/lib/utils";

/** برچسب کوچک «خدمت» روی کارت و صفحه‌ی محصول */
export function ServiceBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-brand-soft text-brand-strong border-brand/40 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
        className,
      )}
    >
      خدمت
    </span>
  );
}
