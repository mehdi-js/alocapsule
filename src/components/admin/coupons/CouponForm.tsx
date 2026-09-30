"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { describeCoupon } from "@/lib/coupon";
import { parseIntegerInput, toPersianDigits } from "@/lib/utils";
import {
  createCouponAction,
  generateCouponCodeAction,
  updateCouponAction,
} from "@/server/actions/coupon";
import type { CouponEditDto } from "@/server/services/coupon-admin.service";

import {
  type CouponType,
  type FormState,
  initialState,
  toInput,
} from "./coupon-form-state";
import { CouponLimitsSection } from "./CouponLimitsSection";
import { CouponScopeField } from "./CouponScopeField";

const section = "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";
const numeric = { dir: "ltr", inputMode: "numeric" } as const;

export function CouponForm({
  coupon,
  categories,
  products,
}: {
  coupon?: CouponEditDto;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(() => initialState(coupon));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const patch = (update: Partial<FormState>) =>
    setState((current) => ({ ...current, ...update }));
  const error = (field: string) => errors[field];

  const valueNumber = parseIntegerInput(state.value);
  const preview =
    state.type === "FREE_SHIPPING" || valueNumber !== null
      ? describeCoupon({
          type: state.type,
          value: valueNumber ?? 0,
          maxDiscountAmount: parseIntegerInput(state.maxDiscountAmount),
        })
      : null;

  function generate() {
    startTransition(async () => {
      const result = await generateCouponCodeAction();
      if (result.ok) patch({ code: result.code });
      else toast.error(result.message);
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const input = toInput(state);
      const result = coupon
        ? await updateCouponAction(coupon.id, input)
        : await createCouponAction(input);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(coupon ? "تغییرات ذخیره شد." : "کد تخفیف ساخته شد.");
      router.push("/admin/coupons");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {coupon && coupon.usedCount > 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          این کد {toPersianDigits(coupon.usedCount)} بار استفاده شده است.
          تغییرات روی سفارش‌های قبلی اثری ندارد (مبلغ تخفیف در سفارش ثبت شده
          است).
        </p>
      ) : null}

      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">مشخصات کد</h2>
          <label className="flex items-center gap-3 text-sm font-medium">
            فعال
            <Switch
              checked={state.isActive}
              label="فعال بودن کد"
              onChange={(isActive) => patch({ isActive })}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="کد"
            htmlFor="code"
            error={error("code")}
            hint="حروف لاتین و عدد؛ خودکار بزرگ می‌شود."
            required
          >
            <div className="flex gap-2">
              <Input
                id="code"
                dir="ltr"
                value={state.code}
                invalid={!!error("code")}
                className="font-mono uppercase"
                onChange={(event) => patch({ code: event.target.value })}
              />
              <Button
                variant="secondary"
                onClick={generate}
                disabled={isPending}
              >
                تولید کد
              </Button>
            </div>
          </Field>
          <Field
            label="عنوان (برای مشتری و گزارش)"
            htmlFor="title"
            error={error("title")}
            required
          >
            <Input
              id="title"
              value={state.title}
              invalid={!!error("title")}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
          <Field label="نوع تخفیف" htmlFor="type" required>
            <Select
              id="type"
              value={state.type}
              onChange={(event) =>
                patch({ type: event.target.value as CouponType })
              }
            >
              <option value="PERCENT">درصدی</option>
              <option value="FIXED">مبلغ ثابت</option>
              <option value="FREE_SHIPPING">ارسال رایگان</option>
            </Select>
          </Field>
          {state.type !== "FREE_SHIPPING" ? (
            <Field
              label={
                state.type === "PERCENT"
                  ? "درصد تخفیف (۱ تا ۱۰۰)"
                  : "مبلغ تخفیف (تومان)"
              }
              htmlFor="value"
              error={error("value")}
              required
            >
              <Input
                id="value"
                value={state.value}
                invalid={!!error("value")}
                onChange={(event) => patch({ value: event.target.value })}
                {...numeric}
              />
            </Field>
          ) : null}
          {state.type === "PERCENT" ? (
            <Field
              label="سقف مبلغ تخفیف (تومان، اختیاری)"
              htmlFor="maxDiscountAmount"
              error={error("maxDiscountAmount")}
              hint="تخفیف درصدی به پایین و تا ۱٬۰۰۰ تومان گرد می‌شود."
            >
              <Input
                id="maxDiscountAmount"
                value={state.maxDiscountAmount}
                invalid={!!error("maxDiscountAmount")}
                onChange={(event) =>
                  patch({ maxDiscountAmount: event.target.value })
                }
                {...numeric}
              />
            </Field>
          ) : null}
          <Field
            label="حداقل مبلغ سبد (تومان، اختیاری)"
            htmlFor="minOrderAmount"
            error={error("minOrderAmount")}
          >
            <Input
              id="minOrderAmount"
              value={state.minOrderAmount}
              invalid={!!error("minOrderAmount")}
              onChange={(event) =>
                patch({ minOrderAmount: event.target.value })
              }
              {...numeric}
            />
          </Field>
        </div>
        {preview ? (
          <p className="text-sm text-neutral-600">پیش‌نمایش: {preview}</p>
        ) : null}
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">دامنه</h2>
        <CouponScopeField
          scope={state.scope}
          categoryIds={state.categoryIds}
          productIds={state.productIds}
          categories={categories}
          products={products}
          errors={errors}
          onChange={patch}
        />
      </section>

      <CouponLimitsSection state={state} error={error} onChange={patch} />

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Link href="/admin/coupons" className={buttonClasses("secondary")}>
          انصراف
        </Link>
        <Button type="submit" loading={isPending}>
          {coupon ? "ذخیره‌ی تغییرات" : "ساخت کد تخفیف"}
        </Button>
      </div>
    </form>
  );
}
