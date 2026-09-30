import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** برچسب + کنترل + خطا/راهنمای فرم‌های فروشگاه؛ `id` باید با `id` کنترل یکی باشد */
export function ShopField({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-faint text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
