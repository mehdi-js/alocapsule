import type { ShippingInfoItem } from "@/lib/shipping-info";

import { ClockIcon, TruckIcon } from "./icons";

/**
 * ردیف اطلاعات زیر جعبه‌ی خرید: زمان و هزینه‌ی روش‌های ارسال فعال، تحویل
 * حضوری و ارسال رایگان تعدادی — از داده‌ی `ShippingMethod`، نه متن ثابت.
 */
export function ProductInfoRow({ items }: { items: ShippingInfoItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul
      className="text-ink-soft flex flex-col gap-2 text-sm"
      data-shipping-info
    >
      {items.map(({ key, kind, text }) => {
        const Icon = kind === "pickup" ? ClockIcon : TruckIcon;
        return (
          <li key={key} className="flex items-center gap-2.5">
            <Icon size={18} className="text-brand shrink-0" />
            {text}
          </li>
        );
      })}
    </ul>
  );
}
