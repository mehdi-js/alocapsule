"use client";

import Link from "next/link";
import { useEffect } from "react";

import { formatToman } from "@/lib/money";
import { cn, toPersianDigits } from "@/lib/utils";

import { CartIcon, CloseIcon } from "../icons";
import { btnPrimary, iconButton } from "../styles";
import { CartLine } from "./CartLine";
import { useCart } from "./CartProvider";

/** کشوی مینی‌کارت: بعد از افزودن و با کلیک آیکون سبد در هدر باز می‌شود. */
export function MiniCart() {
  const { cart, drawerOpen, closeDrawer, update, remove } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;
  const lines = cart?.lines ?? [];

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="سبد خرید"
    >
      <button
        type="button"
        aria-label="بستن سبد"
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/55"
      />
      <aside className="bg-panel absolute inset-y-0 end-0 flex w-full max-w-[420px] animate-[fade_200ms_ease] flex-col border-s border-hair">
        <div className="flex items-center justify-between gap-3 border-b border-hair px-5 py-4">
          <h2 className="text-lg font-extrabold">
            سبد خرید
            {cart && cart.itemCount > 0 ? (
              <span className="text-muted ms-2 text-sm font-medium">
                ({toPersianDigits(cart.itemCount)} عدد)
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="بستن"
            className={iconButton}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="bg-card text-accent flex size-14 items-center justify-center rounded-full">
              <CartIcon size={24} />
            </span>
            <p className="font-bold">سبد خرید شما خالی است</p>
            <Link href="/products" onClick={closeDrawer} className={btnPrimary}>
              مشاهده محصولات
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {lines.map((line) => (
                <li
                  key={line.variantId}
                  className="border-b border-hair pb-4 last:border-0"
                >
                  <CartLine
                    line={line}
                    size="sm"
                    maxQuantity={cart?.maxQuantity ?? 1}
                    onUpdate={(quantity) => update(line.variantId, quantity)}
                    onRemove={() => remove(line.variantId)}
                  />
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-4 border-t border-hair px-5 py-5">
              {cart && cart.discountTotal > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">تخفیف</span>
                  <span className="text-accent font-bold">
                    −{formatToman(cart.discountTotal)} تومان
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-muted text-sm">
                  {cart && cart.discountTotal > 0
                    ? "جمع پس از تخفیف"
                    : "جمع کالاها"}
                </span>
                <span className="text-brand-strong text-xl font-extrabold">
                  {formatToman(cart?.total ?? 0)}{" "}
                  <span className="text-ink-soft text-sm font-semibold">
                    تومان
                  </span>
                </span>
              </div>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className={cn(btnPrimary, "w-full")}
              >
                مشاهده سبد خرید
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
