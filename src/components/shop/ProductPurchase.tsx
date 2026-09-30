"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatToman } from "@/lib/money";
import {
  chipStates,
  type PageOption,
  selectForChip,
  selectionQuery,
} from "@/lib/option-selection";
import { cn, toPersianDigits } from "@/lib/utils";
import type { CatalogVariantDto } from "@/server/services/catalog-page.service";

import { useCart } from "./cart/CartProvider";
import { CartIcon } from "./icons";
import { QtyStepper } from "./QtyStepper";
import { btnPrimary, panel, variantPill } from "./styles";

/** قرص انتخاب یک مقدار گزینه؛ مقدار بدون ترکیب فعال کم‌رنگ و غیرقابل انتخاب است */
const chipClass = (selected: boolean, available: boolean) =>
  cn(variantPill(selected), !available && "cursor-not-allowed opacity-40");

/**
 * انتخاب گزینه‌ها + جعبه‌ی قیمت + افزودن به سبد (SEO.md §۴.۵). ترکیبِ اولیه را
 * **سرور** از پارامتر URL تعیین می‌کند (`initialVariantId`)؛ کلیک روی دکمه‌ها
 * فوراً قیمت را عوض و پارامتر را با `router.replace` (بدون ورودی تاریخچه)
 * همگام می‌کند. محصول قدیمی چندقیمتیِ بدون گروه گزینه قرص‌های عنوان را نشان می‌دهد.
 * در موبایل شمارنده، جمع و دکمه در نوار چسبان پایین صفحه‌اند (طبق طراحی).
 */
export function ProductPurchase({
  variants,
  options,
  initialVariantId,
  isGram,
  maxQuantity,
  priceUpdatedLabel,
  priceNote,
}: {
  variants: CatalogVariantDto[];
  options: PageOption[];
  initialVariantId: string | undefined;
  isGram: boolean;
  maxQuantity: number;
  /** «۱۴۰۵/۰۷/۰۹»؛ خالی ⇒ خط نمایش داده نمی‌شود */
  priceUpdatedLabel: string | null;
  /** جمله‌ی «قیمت شامل چیست» (`catalog.priceIncludesNote`) زیر قیمت */
  priceNote: string | null;
}) {
  const { add } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [variantId, setVariantId] = useState(initialVariantId);
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  // ناوبری برگشت/جلو یا لینک سوییچ، ترکیب اولیه‌ی سرور را عوض می‌کند
  useEffect(() => setVariantId(initialVariantId), [initialVariantId]);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  if (!variant) return null;

  function choose(optionCode: string, valueCode: string) {
    if (!variant) return;
    const next = selectForChip(
      variants,
      variant.selection,
      optionCode,
      valueCode,
    );
    if (!next || next.id === variant.id) return;
    setVariantId(next.id);
    router.replace(`${pathname}${selectionQuery(options, next.selection)}`, {
      scroll: false,
    });
  }
  const groups = chipStates(options, variants, variant.selection);

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
      {groups.map(({ option, chips }) => (
        <fieldset
          key={option.code}
          className="flex flex-col gap-3"
          data-option={option.code}
        >
          <legend className="text-muted mb-3 text-sm">{option.name}</legend>
          <div className="flex flex-wrap gap-2.5">
            {chips.map((chip) => (
              <button
                key={chip.code}
                type="button"
                aria-pressed={chip.selected}
                disabled={!chip.available}
                data-value={chip.code}
                onClick={() => choose(option.code, chip.code)}
                className={chipClass(chip.selected, chip.available)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {groups.length === 0 && variants.length > 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-muted mb-3 text-sm">
            {isGram
              ? "وزن بسته را انتخاب کنید"
              : "تعداد در بسته را انتخاب کنید"}
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
      ) : null}

      <div className={cn(panel, "flex flex-col gap-4.5 px-6 py-5.5")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-[13px]">
              {variant.title ? `قیمت ${variant.title}` : "قیمت"}
            </span>
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
            {priceUpdatedLabel ? (
              <span className="text-muted text-xs">
                آخرین به‌روزرسانی قیمت: {priceUpdatedLabel}
              </span>
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

        {priceNote ? (
          <p className="text-muted border-t border-hair pt-4 text-xs leading-6">
            {priceNote}
          </p>
        ) : null}

        <div className="hidden items-center justify-between gap-4 border-t border-hair pt-4 md:flex">
          <span className="text-muted text-sm">
            جمع سفارش ({toPersianDigits(qty)}
            {variant.title ? ` × ${variant.title}` : ""})
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
            {toPersianDigits(qty)}
            {variant.title ? ` × ${variant.title}` : ""}
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
