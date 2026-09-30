import { cn, toPersianDigits } from "@/lib/utils";

const STEPS = ["سبد خرید", "اطلاعات ارسال", "پرداخت"];

/** نشانگر سه‌مرحله‌ای خرید؛ مراحل قبلی و فعلی سبز هستند. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol
      className="flex items-center gap-2 text-sm md:gap-3"
      aria-label="مراحل خرید"
    >
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2 md:gap-3">
          {index > 0 ? (
            <span
              aria-hidden
              className={cn(
                "h-px w-6 md:w-12",
                index <= current ? "bg-action" : "bg-[rgb(201_168_118/0.3)]",
              )}
            />
          ) : null}
          <span
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-bold",
              index <= current
                ? "bg-action text-action-ink"
                : "bg-card text-muted border border-[rgb(201_168_118/0.22)]",
            )}
          >
            {toPersianDigits(index + 1)}
          </span>
          <span
            className={
              index === current ? "font-bold" : "text-muted hidden sm:inline"
            }
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}
