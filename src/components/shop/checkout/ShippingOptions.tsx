"use client";

import { formatToman } from "@/lib/money";
import { PAY_ON_DELIVERY_LABEL, shippingCost } from "@/lib/order-pricing";
import { cn, toPersianDigits } from "@/lib/utils";
import type { ShippingOptionDto } from "@/server/services/checkout.service";

import { choiceCard, panel } from "../styles";

/** روش‌های ارسالِ قابل انتخاب برای استان آدرس انتخاب‌شده */
export function ShippingOptions({
  methods,
  selectedId,
  onSelect,
  goodsAmount,
  itemCount,
  freeShippingCoupon,
}: {
  methods: ShippingOptionDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** مبلغ کالا پس از تخفیف (مبنای آستانه‌ی ارسال رایگان) */
  goodsAmount: number;
  /** مجموع تعداد اقلام سبد (مبنای ارسال رایگان تعدادی) */
  itemCount: number;
  freeShippingCoupon: boolean;
}) {
  return (
    <section
      aria-labelledby="shipping-heading"
      className={cn(panel, "flex flex-col gap-4 p-5 md:p-6")}
    >
      <h2 id="shipping-heading" className="text-lg font-extrabold">
        روش ارسال
      </h2>
      {methods.length === 0 ? (
        <p className="text-danger text-sm">روش ارسالی در دسترس نیست.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {methods.map((method) => {
            const cost = shippingCost(method, goodsAmount, itemCount);
            const inputId = `shipping-${method.id}`;
            const free =
              !method.payOnDelivery && (cost === 0 || freeShippingCoupon);
            return (
              <li
                key={method.id}
                className={choiceCard(method.id === selectedId)}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="shipping"
                  checked={method.id === selectedId}
                  onChange={() => onSelect(method.id)}
                  className="accent-action mt-1 size-4 shrink-0"
                />
                <label
                  htmlFor={inputId}
                  className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-start justify-between gap-x-4 gap-y-1.5"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-bold">{method.name}</span>
                    {method.description ? (
                      <span className="text-muted text-sm">
                        {method.description}
                      </span>
                    ) : null}
                    {method.freeAboveQuantity !== null && cost > 0 ? (
                      <span className="text-faint text-xs">
                        ارسال رایگان از{" "}
                        {toPersianDigits(method.freeAboveQuantity)} عدد به بالا
                      </span>
                    ) : null}
                    {method.freeAboveAmount !== null && cost > 0 ? (
                      <span className="text-faint text-xs">
                        ارسال رایگان برای خرید از{" "}
                        {formatToman(method.freeAboveAmount)} تومان
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-bold",
                      free ? "text-action" : "text-ink",
                    )}
                  >
                    {method.payOnDelivery
                      ? PAY_ON_DELIVERY_LABEL
                      : free
                        ? "رایگان"
                        : `${formatToman(cost)} تومان`}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
