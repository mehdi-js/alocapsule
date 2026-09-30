"use client";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import type { FormState } from "./coupon-form-state";

const section = "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";
const numeric = { dir: "ltr", inputMode: "numeric" } as const;

/** سقف‌های استفاده، بازه‌ی زمانی شمسی و «فقط خرید اول» */
export function CouponLimitsSection({
  state,
  error,
  onChange: patch,
}: {
  state: FormState;
  error: (field: string) => string | undefined;
  onChange: (update: Partial<FormState>) => void;
}) {
  return (
    <section className={section}>
      <h2 className="text-lg font-bold">محدودیت‌ها</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="سقف استفاده‌ی کل (اختیاری)"
          htmlFor="usageLimitTotal"
          error={error("usageLimitTotal")}
        >
          <Input
            id="usageLimitTotal"
            value={state.usageLimitTotal}
            invalid={!!error("usageLimitTotal")}
            onChange={(event) => patch({ usageLimitTotal: event.target.value })}
            {...numeric}
          />
        </Field>
        <Field
          label="سقف استفاده‌ی هر کاربر (اختیاری)"
          htmlFor="usageLimitPerUser"
          error={error("usageLimitPerUser")}
        >
          <Input
            id="usageLimitPerUser"
            value={state.usageLimitPerUser}
            invalid={!!error("usageLimitPerUser")}
            onChange={(event) =>
              patch({ usageLimitPerUser: event.target.value })
            }
            {...numeric}
          />
        </Field>
        <Field
          label="از تاریخ (اختیاری)"
          htmlFor="startsAt"
          error={error("startsAt")}
          hint="شمسی، مثل ۱۴۰۵/۰۷/۰۱ — از ابتدای روز"
        >
          <Input
            id="startsAt"
            dir="ltr"
            value={state.startsAt}
            placeholder="1405/07/01"
            invalid={!!error("startsAt")}
            onChange={(event) => patch({ startsAt: event.target.value })}
          />
        </Field>
        <Field
          label="تا تاریخ (اختیاری)"
          htmlFor="expiresAt"
          error={error("expiresAt")}
          hint="شمسی — تا پایان همان روز"
        >
          <Input
            id="expiresAt"
            dir="ltr"
            value={state.expiresAt}
            placeholder="1405/12/29"
            invalid={!!error("expiresAt")}
            onChange={(event) => patch({ expiresAt: event.target.value })}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.firstOrderOnly}
          onChange={(event) => patch({ firstOrderOnly: event.target.checked })}
        />
        فقط برای اولین خرید (کاربری که سفارش پرداخت‌شده ندارد)
      </label>
    </section>
  );
}
