"use client";

import { type FormEvent, useState } from "react";

import { SERVICE_AREAS } from "@/lib/service-area";
import { cn } from "@/lib/utils";
import type { AddressFormInput } from "@/lib/validation/address";
import {
  createAddressAction,
  updateAddressAction,
} from "@/server/actions/address";
import type { AddressDto } from "@/server/services/address.service";

import { ShopField } from "../ShopField";
import { btnOutline, btnPrimary, shopInput } from "../styles";

export interface AddressFormDefaults {
  receiverName: string;
  receiverPhone: string;
}

/** فرم افزودن/ویرایش آدرس (درون صفحه‌ی تسویه، بدون مودال) */
export function AddressForm({
  address,
  defaults,
  onSaved,
  onCancel,
}: {
  /** آدرس در حال ویرایش؛ خالی = آدرس جدید */
  address: AddressDto | null;
  defaults: AddressFormDefaults;
  onSaved: (addresses: AddressDto[], addressId: string | undefined) => void;
  onCancel: (() => void) | null;
}) {
  const firstArea = SERVICE_AREAS[0];
  const [values, setValues] = useState<AddressFormInput>({
    receiverName: address?.receiverName ?? defaults.receiverName,
    receiverPhone: address?.receiverPhone ?? defaults.receiverPhone,
    province: address?.province ?? firstArea?.province ?? "",
    city: address?.city ?? firstArea?.cities[0] ?? "",
    postalCode: address?.postalCode ?? "",
    line: address?.line ?? "",
    isDefault: address?.isDefault ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cities =
    SERVICE_AREAS.find((area) => area.province === values.province)?.cities ??
    [];

  function set<K extends keyof AddressFormInput>(
    key: K,
    value: AddressFormInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const result = address
        ? await updateAddressAction(address.id, values)
        : await createAddressAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.fieldErrors ? null : result.message);
        return;
      }
      setErrors({});
      onSaved(result.addresses, result.addressId);
    } finally {
      setPending(false);
    }
  }

  const invalid = (key: string) => (errors[key] ? true : undefined);
  const describedBy = (key: string) =>
    errors[key] ? `address-${key}-error` : undefined;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={pending}
      className="bg-card/40 flex flex-col gap-4 rounded-[18px] border border-dashed border-outline p-4 md:p-5"
    >
      <p className="font-bold">{address ? "ویرایش آدرس" : "آدرس جدید"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ShopField
          id="address-receiverName"
          label="نام گیرنده"
          error={errors.receiverName}
        >
          <input
            id="address-receiverName"
            value={values.receiverName}
            onChange={(event) => set("receiverName", event.target.value)}
            autoComplete="name"
            aria-invalid={invalid("receiverName")}
            aria-describedby={describedBy("receiverName")}
            className={shopInput}
          />
        </ShopField>
        <ShopField
          id="address-receiverPhone"
          label="موبایل گیرنده"
          error={errors.receiverPhone}
        >
          <input
            id="address-receiverPhone"
            value={values.receiverPhone}
            onChange={(event) => set("receiverPhone", event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="09xxxxxxxxx"
            aria-invalid={invalid("receiverPhone")}
            aria-describedby={describedBy("receiverPhone")}
            className={cn(shopInput, "text-start")}
          />
        </ShopField>
        <ShopField id="address-province" label="استان" error={errors.province}>
          <select
            id="address-province"
            value={values.province}
            onChange={(event) => {
              const province = event.target.value;
              const area = SERVICE_AREAS.find((a) => a.province === province);
              setValues((current) => ({
                ...current,
                province,
                city: area?.cities[0] ?? "",
              }));
            }}
            aria-invalid={invalid("province")}
            className={shopInput}
          >
            {SERVICE_AREAS.map((area) => (
              <option key={area.province} value={area.province}>
                {area.province}
              </option>
            ))}
          </select>
        </ShopField>
        <ShopField
          id="address-city"
          label="شهر"
          error={errors.city}
          hint="فعلاً فقط به شهر تهران ارسال داریم."
        >
          <select
            id="address-city"
            value={values.city}
            onChange={(event) => set("city", event.target.value)}
            aria-invalid={invalid("city")}
            aria-describedby={describedBy("city")}
            className={shopInput}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </ShopField>
        <ShopField
          id="address-line"
          label="نشانی کامل"
          error={errors.line}
          className="sm:col-span-2"
        >
          <textarea
            id="address-line"
            value={values.line}
            onChange={(event) => set("line", event.target.value)}
            rows={3}
            autoComplete="street-address"
            placeholder="خیابان، کوچه، پلاک، واحد"
            aria-invalid={invalid("line")}
            aria-describedby={describedBy("line")}
            className={cn(shopInput, "resize-y leading-7")}
          />
        </ShopField>
        <ShopField
          id="address-postalCode"
          label="کد پستی (اختیاری)"
          error={errors.postalCode}
        >
          <input
            id="address-postalCode"
            value={values.postalCode}
            onChange={(event) => set("postalCode", event.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            dir="ltr"
            aria-invalid={invalid("postalCode")}
            aria-describedby={describedBy("postalCode")}
            className={cn(shopInput, "text-start")}
          />
        </ShopField>
        <label className="flex items-center gap-2.5 self-end pb-3 text-sm">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(event) => set("isDefault", event.target.checked)}
            className="accent-brand-strong size-4"
          />
          آدرس پیش‌فرض من باشد
        </label>
      </div>
      {message ? (
        <p role="alert" className="text-danger text-sm">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "در حال ذخیره…" : "ذخیره‌ی آدرس"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={btnOutline}
          >
            انصراف
          </button>
        ) : null}
      </div>
    </form>
  );
}
