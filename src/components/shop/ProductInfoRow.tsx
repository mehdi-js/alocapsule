import { toPersianDigits } from "@/lib/utils";

import { ClockIcon, TruckIcon } from "./icons";

/**
 * ردیف اطلاعات زیر جعبه‌ی خرید: تحویل حضوری و ارسال رایگان تعدادی — از
 * داده‌ی `ShippingMethod` و `business.*`، نه متن ثابت.
 */
export function ProductInfoRow({
  pickupHours,
  pickupAvailable,
  freeAboveQuantity,
}: {
  pickupHours: string;
  pickupAvailable: boolean;
  freeAboveQuantity: number | null;
}) {
  const items = [
    pickupAvailable
      ? { key: "pickup", Icon: ClockIcon, text: `تحویل حضوری: ${pickupHours}` }
      : null,
    freeAboveQuantity !== null
      ? {
          key: "free",
          Icon: TruckIcon,
          text: `ارسال رایگان از ${toPersianDigits(freeAboveQuantity)} عدد به بالا`,
        }
      : null,
  ].filter((item) => item !== null);
  if (items.length === 0) return null;
  return (
    <ul className="text-ink-soft flex flex-col gap-2 text-sm">
      {items.map(({ key, Icon, text }) => (
        <li key={key} className="flex items-center gap-2.5">
          <Icon size={18} className="text-brand shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
}
