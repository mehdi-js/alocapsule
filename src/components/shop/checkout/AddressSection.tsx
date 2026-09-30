"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { isServedLocation, OUT_OF_AREA_MESSAGE } from "@/lib/service-area";
import { cn, toPersianDigits } from "@/lib/utils";
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/server/actions/address";
import type { AddressDto } from "@/server/services/address.service";

import { choiceCard, panel } from "../styles";
import { AddressForm, type AddressFormDefaults } from "./AddressForm";

const linkButton =
  "text-accent hover:text-accent-hover text-sm underline-offset-4 transition hover:underline disabled:opacity-50";

function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onChanged,
}: {
  address: AddressDto;
  selected: boolean;
  /** بدون `onSelect` (صفحه‌ی آدرس‌های پنل) کارت فقط نمایش/مدیریت است */
  onSelect?: () => void;
  onEdit: () => void;
  onChanged: (addresses: AddressDto[]) => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const served = isServedLocation(address.province, address.city);
  const inputId = `address-${address.id}`;

  async function run(action: () => ReturnType<typeof deleteAddressAction>) {
    setPending(true);
    try {
      const result = await action();
      if (result.ok) onChanged(result.addresses);
      else toast.error(result.message);
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <li
      className={cn(
        choiceCard(selected),
        !onSelect && "cursor-default",
        !served && "opacity-60",
      )}
    >
      {onSelect ? (
        <input
          id={inputId}
          type="radio"
          name="address"
          checked={selected}
          onChange={onSelect}
          disabled={!served}
          className="accent-brand-strong mt-1 size-4 shrink-0"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label
          htmlFor={onSelect ? inputId : undefined}
          className="flex cursor-pointer flex-col gap-1.5"
        >
          <span className="flex flex-wrap items-center gap-2 font-bold">
            {address.receiverName}
            <span dir="ltr" className="text-ink-soft text-sm font-medium">
              {toPersianDigits(address.receiverPhone)}
            </span>
            {address.isDefault ? (
              <span className="bg-accent/15 text-accent rounded-full px-2.5 py-0.5 text-xs">
                پیش‌فرض
              </span>
            ) : null}
          </span>
          <span className="text-ink-soft text-sm leading-7">
            {address.province}، {address.city}، {address.line}
            {address.postalCode ? (
              <> · کد پستی {toPersianDigits(address.postalCode)}</>
            ) : null}
          </span>
        </label>
        {!served ? (
          <p className="text-danger text-xs">{OUT_OF_AREA_MESSAGE}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {confirming ? (
            <>
              <span className="text-sm">این آدرس حذف شود؟</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteAddressAction(address.id))}
                className="text-danger text-sm font-bold"
              >
                بله، حذف شود
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className={linkButton}
              >
                انصراف
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onEdit} className={linkButton}>
                ویرایش
              </button>
              {!address.isDefault ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setDefaultAddressAction(address.id))}
                  className={linkButton}
                >
                  پیش‌فرض شود
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-muted hover:text-danger text-sm transition"
              >
                حذف
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** انتخاب آدرس ارسال + افزودن/ویرایش/حذف/پیش‌فرض */
export function AddressSection({
  addresses,
  selectedId,
  defaults,
  onSelect,
  onAddressesChange,
  title = "آدرس ارسال",
  areaNote,
}: {
  addresses: AddressDto[];
  selectedId: string | null;
  defaults: AddressFormDefaults;
  /** بدون آن: حالت مدیریت (بدون انتخاب آدرس ارسال) */
  onSelect?: (id: string) => void;
  onAddressesChange: (addresses: AddressDto[], selectId?: string) => void;
  title?: string;
  /** توضیح محدوده‌ی ارسال (`shipping.areaNote`) زیر عنوان */
  areaNote?: string;
}) {
  // «new» = فرم آدرس جدید؛ شناسه = فرم ویرایش همان آدرس
  const [editing, setEditing] = useState<string | null>(null);
  const showForm = editing !== null || addresses.length === 0;
  const editingAddress =
    addresses.find((address) => address.id === editing) ?? null;

  return (
    <section
      aria-labelledby="address-heading"
      className={cn(panel, "flex flex-col gap-4 p-5 md:p-6")}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="address-heading" className="text-lg font-extrabold">
          {title}
        </h2>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={linkButton}
          >
            + افزودن آدرس جدید
          </button>
        ) : null}
      </div>

      {areaNote ? (
        <p className="text-muted -mt-2 text-sm" id="shipping-area-note">
          {areaNote}
        </p>
      ) : null}

      {addresses.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="آدرس‌های من">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={address.id === selectedId}
              onSelect={onSelect ? () => onSelect(address.id) : undefined}
              onEdit={() => setEditing(address.id)}
              onChanged={(next) => onAddressesChange(next)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted text-sm">
          هنوز آدرسی ثبت نکرده‌اید؛ آدرس گیرنده را وارد کنید.
        </p>
      )}

      {showForm ? (
        <AddressForm
          key={editing ?? "first"}
          address={editingAddress}
          defaults={defaults}
          onSaved={(next, addressId) => {
            setEditing(null);
            onAddressesChange(next, addressId);
          }}
          onCancel={addresses.length > 0 ? () => setEditing(null) : null}
        />
      ) : null}
    </section>
  );
}
