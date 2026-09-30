"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { PAY_ON_DELIVERY_LABEL } from "@/lib/order-pricing";
import { SERVICE_AREAS } from "@/lib/service-area";
import { parseIntegerInput } from "@/lib/utils";
import { saveShippingMethodAction } from "@/server/actions/settings";

export interface ShippingRow {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  freeAboveAmount: number | null;
  freeAboveQuantity: number | null;
  requiresAddress: boolean;
  deliveryEstimate: string | null;
  businessHoursOnly: boolean;
  payOnDelivery: boolean;
  provinces: string[];
  isActive: boolean;
  sortOrder: number;
}

/** فرم ساخت/ویرایش روش ارسال (داخل مودال مدیریت روش‌های ارسال) */
export function MethodForm({
  method,
  onDone,
}: {
  method: ShippingRow | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState({
    name: method?.name ?? "",
    description: method?.description ?? "",
    cost: method ? String(method.cost) : "",
    freeAboveAmount: method?.freeAboveAmount
      ? String(method.freeAboveAmount)
      : "",
    freeAboveQuantity: method?.freeAboveQuantity
      ? String(method.freeAboveQuantity)
      : "",
    requiresAddress: method?.requiresAddress ?? true,
    deliveryEstimate: method?.deliveryEstimate ?? "",
    businessHoursOnly: method?.businessHoursOnly ?? false,
    provinces: method?.provinces ?? [],
    payOnDelivery: method?.payOnDelivery ?? false,
    isActive: method?.isActive ?? true,
    sortOrder: String(method?.sortOrder ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveShippingMethodAction(method?.id ?? null, {
        name: values.name,
        description: values.description,
        cost: values.payOnDelivery
          ? 0
          : (parseIntegerInput(values.cost) ?? Number.NaN),
        freeAboveAmount:
          !values.payOnDelivery && values.freeAboveAmount.trim()
            ? (parseIntegerInput(values.freeAboveAmount) ?? Number.NaN)
            : null,
        freeAboveQuantity:
          !values.payOnDelivery && values.freeAboveQuantity.trim()
            ? (parseIntegerInput(values.freeAboveQuantity) ?? Number.NaN)
            : null,
        requiresAddress: values.requiresAddress,
        deliveryEstimate: values.deliveryEstimate,
        businessHoursOnly: values.businessHoursOnly,
        payOnDelivery: values.payOnDelivery,
        // روش بدون آدرس (تحویل حضوری) به استان وابسته نیست
        provinces: values.requiresAddress ? values.provinces : [],
        isActive: values.isActive,
        sortOrder: parseIntegerInput(values.sortOrder) ?? 0,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("روش ارسال ذخیره شد.");
      onDone();
    });
  }

  const text = (
    key:
      | "name"
      | "description"
      | "cost"
      | "freeAboveAmount"
      | "freeAboveQuantity"
      | "deliveryEstimate"
      | "sortOrder",
    label: string,
    hint?: string,
    numeric = false,
  ) => (
    <Field
      label={label}
      htmlFor={`ship-${key}`}
      error={errors[key]}
      hint={hint}
    >
      <Input
        id={`ship-${key}`}
        value={values[key]}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        inputMode={numeric ? "numeric" : undefined}
        dir={numeric ? "ltr" : undefined}
        invalid={Boolean(errors[key])}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {text("name", "نام")}
      {text("description", "توضیح (اختیاری)")}
      {text(
        "deliveryEstimate",
        "زمان تحویل (اختیاری)",
        "مثل «۱ روزه» یا «۱ تا ۴ ساعت»؛ در تسویه، صفحه‌ی محصول و سوالات متداول نمایش داده می‌شود.",
      )}
      <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={values.businessHoursOnly}
          onChange={(e) =>
            setValues((v) => ({ ...v, businessHoursOnly: e.target.checked }))
          }
        />
        <span>
          فقط در ساعات کاری
          <span className="block text-xs text-neutral-500">
            خارج از ساعات کاری (تنظیمات ← کسب‌وکار و خدمت) این روش در تسویه
            غیرفعال نمایش داده می‌شود (مثل ارسال فوری).
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={!values.requiresAddress}
          onChange={(e) =>
            setValues((v) => ({ ...v, requiresAddress: !e.target.checked }))
          }
        />
        <span>
          تحویل حضوری (بدون آدرس)
          <span className="block text-xs text-neutral-500">
            مشتری آدرس وارد نمی‌کند و به‌جایش محل و ساعت تحویل (تنظیمات ←
            کسب‌وکار و خدمت) نمایش داده می‌شود.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={values.payOnDelivery}
          onChange={(e) =>
            setValues((v) => ({ ...v, payOnDelivery: e.target.checked }))
          }
        />
        <span>
          هزینه‌ی پیک درب منزل توسط مشتری پرداخت می‌شود
          <span className="block text-xs text-neutral-500">
            در سایت هزینه‌ای برای ارسال گرفته نمی‌شود و به مشتری «
            {PAY_ON_DELIVERY_LABEL}» نمایش داده می‌شود.
          </span>
        </span>
      </label>
      {values.payOnDelivery ? null : (
        <>
          {text("cost", "هزینه (تومان)", undefined, true)}
          {text(
            "freeAboveAmount",
            "ارسال رایگان از مبلغ (اختیاری)",
            "با مبلغ کالا پس از تخفیف مقایسه می‌شود.",
            true,
          )}
          {text(
            "freeAboveQuantity",
            "ارسال رایگان از تعداد (اختیاری)",
            "مجموع تعداد همه‌ی اقلام سبد (مثلاً ۱۰). اگر مبلغ یا تعداد برقرار باشد، ارسال رایگان است.",
            true,
          )}
        </>
      )}
      <fieldset
        className="space-y-2"
        hidden={!values.requiresAddress}
        disabled={!values.requiresAddress}
      >
        <legend className="text-sm font-medium">محدود به استان</legend>
        <p className="text-xs text-neutral-500">
          هیچ‌کدام = همه‌ی مناطق تحت پوشش.
        </p>
        {SERVICE_AREAS.map((area) => (
          <label
            key={area.province}
            className="flex items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={values.provinces.includes(area.province)}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  provinces: e.target.checked
                    ? [...v.provinces, area.province]
                    : v.provinces.filter((p) => p !== area.province),
                }))
              }
            />
            {area.province}
          </label>
        ))}
        {errors.provinces ? (
          <p role="alert" className="text-xs text-red-600">
            {errors.provinces}
          </p>
        ) : null}
      </fieldset>
      {text("sortOrder", "ترتیب نمایش", undefined, true)}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
        <span className="text-sm">فعال (در صفحه‌ی تسویه نمایش داده شود)</span>
        <Switch
          checked={values.isActive}
          onChange={(checked) =>
            setValues((v) => ({ ...v, isActive: checked }))
          }
          label="روش ارسال فعال"
        />
      </div>
      <Button type="submit" loading={pending}>
        ذخیره
      </Button>
    </form>
  );
}
