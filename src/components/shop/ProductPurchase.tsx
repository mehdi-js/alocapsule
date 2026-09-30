"use client";

import { useState } from "react";

import { formatToman } from "@/lib/money";
import { cn, toPersianDigits } from "@/lib/utils";
import type { CatalogVariantDto } from "@/server/services/catalog-page.service";

import { useCart } from "./cart/CartProvider";
import { CartIcon } from "./icons";
import { QtyStepper } from "./QtyStepper";
import { btnPrimary, panel, variantPill } from "./styles";

/**
 * انتخاب متغیر + جعبه‌ی قیمت + افزودن به سبد. در موبایل شمارنده، جمع و دکمه
 * در نوار چسبان پایین صفحه‌اند (طبق طراحی).
 */
export function ProductPurchase({
  variants,
  isGram,
  maxQuantity,
}: {
  variants: CatalogVariantDto[];
  isGram: boolean;
  maxQuantity: number;
}) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  if (!variant) return null;

  async function addToCart() {
    if (!variant || pending) return;
    setPending(true);
    try {
      await add(variant.id, qty);
    } finally {
      setPending(false);
    }
  }

  const total = variant.price * qty;
  const addLabel = pending ? "در حال افزودن…" : "افزودن به سبد خرید";

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted mb-3 text-sm">
          {isGram ? "وزن بسته را انتخاب کنید" : "تعداد در بسته را انتخاب کنید"}
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {variants.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === variant.id}
              onClick={() => setVariantId(item.id)}
              className={variantPill(item.id === variant.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={cn(panel, "flex flex-col gap-4.5 px-6 py-5.5")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-[13px]">قیمت {variant.title}</span>
            <p className="text-brand-strong text-[26px] font-extrabold whitespace-nowrap md:text-[30px]">
              {formatToman(variant.price)}{" "}
              <span className="text-ink-soft text-[15px] font-semibold">
                تومان
              </span>
            </p>
            {variant.comparePrice ? (
              <s className="text-faint text-sm">
                {formatToman(variant.comparePrice)} تومان
              </s>
            ) : null}
            {variant.pricePerKg !== null && variant.unitValue !== 1000 ? (
              <span className="text-muted text-xs">
                هر کیلوگرم: {formatToman(variant.pricePerKg)} تومان
              </span>
            ) : null}
          </div>
          <div className="hidden md:block">
            <QtyStepper value={qty} max={maxQuantity} onChange={setQty} />
          </div>
        </div>

        <div className="hidden items-center justify-between gap-4 border-t border-hair pt-4 md:flex">
          <span className="text-muted text-sm">
            جمع سفارش ({toPersianDigits(qty)} × {variant.title})
          </span>
          <span className="text-lg font-extrabold">
            {formatToman(total)} تومان
          </span>
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={pending}
          className={cn(btnPrimary, "hidden w-full py-4 text-base md:flex")}
        >
          <CartIcon size={19} />
          {addLabel}
        </button>
      </div>

      {/* نوار چسبان موبایل */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-hair bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="text-muted truncate text-[11px]">
            {toPersianDigits(qty)} × {variant.title}
          </span>
          <span className="text-brand-strong text-sm font-extrabold whitespace-nowrap">
            {formatToman(total)}{" "}
            <span className="text-[11px] font-medium">تومان</span>
          </span>
        </div>
        <QtyStepper value={qty} max={maxQuantity} size="sm" onChange={setQty} />
        <button
          type="button"
          onClick={addToCart}
          disabled={pending}
          className={cn(btnPrimary, "h-12 flex-1 px-3 py-0 text-sm")}
        >
          {pending ? "…" : "افزودن به سبد"}
        </button>
      </div>
    </div>
  );
}
