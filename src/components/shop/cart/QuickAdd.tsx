"use client";

import { useEffect, useRef, useState } from "react";

import { formatToman } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductCardDto } from "@/server/services/catalog.service";

import { CloseIcon, PlusIcon } from "../icons";
import { btnPrimaryCompact, variantPill } from "../styles";
import { useCart } from "./CartProvider";

/**
 * دکمه‌ی + کارت محصول. محصول تک‌متغیره مستقیم به سبد می‌رود؛ برای چندمتغیره
 * یک پنل کوچک انتخاب متغیر روی همان کارت باز می‌شود.
 */
export function QuickAdd({ product }: { product: ProductCardDto }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(product.variants[0]?.id);
  const [pending, setPending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function addVariant(variantId: string | undefined) {
    if (!variantId || pending) return;
    setPending(true);
    try {
      if (await add(variantId, 1)) setOpen(false);
    } finally {
      setPending(false);
    }
  }

  const single = product.variants.length === 1;

  return (
    <>
      <button
        type="button"
        onClick={() =>
          single ? addVariant(product.variants[0]?.id) : setOpen(true)
        }
        disabled={pending}
        aria-label={`افزودن ${product.name} به سبد`}
        aria-expanded={single ? undefined : open}
        className="bg-brand-strong text-on-brand hover:bg-brand-strong-hover flex size-[42px] shrink-0 items-center justify-center rounded-full transition disabled:opacity-60"
      >
        <PlusIcon size={18} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`انتخاب ${product.name}`}
          className="bg-panel absolute inset-x-2 bottom-2 z-10 flex animate-[fade_150ms_ease] flex-col gap-3 rounded-[18px] border border-control p-3.5 shadow-[0_20px_40px_-20px_#000]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">انتخاب بسته</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن"
              className="text-muted hover:text-ink"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={variant.id === selected}
                onClick={() => setSelected(variant.id)}
                className={cn(
                  variantPill(variant.id === selected),
                  "px-3 py-1.5 text-xs",
                )}
              >
                {variant.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addVariant(selected)}
            disabled={pending}
            className={cn(btnPrimaryCompact, "w-full py-2.5")}
          >
            {pending
              ? "در حال افزودن…"
              : `افزودن · ${formatToman(
                  product.variants.find((variant) => variant.id === selected)
                    ?.price ?? 0,
                )} تومان`}
          </button>
        </div>
      ) : null}
    </>
  );
}
