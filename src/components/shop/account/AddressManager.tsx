"use client";

import { useEffect, useState } from "react";

import type { AddressDto } from "@/server/services/address.service";

import type { AddressFormDefaults } from "../checkout/AddressForm";
import { AddressSection } from "../checkout/AddressSection";

/** مدیریت آدرس‌ها در پنل (بدون انتخاب آدرس ارسال) */
export function AddressManager({
  initial,
  defaults,
}: {
  initial: AddressDto[];
  defaults: AddressFormDefaults;
}) {
  const [addresses, setAddresses] = useState(initial);
  useEffect(() => setAddresses(initial), [initial]);

  return (
    <AddressSection
      title="آدرس‌های من"
      addresses={addresses}
      selectedId={null}
      defaults={defaults}
      onAddressesChange={(next) => setAddresses(next)}
    />
  );
}
