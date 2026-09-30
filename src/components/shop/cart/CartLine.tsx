"use client";

import Link from "next/link";
import { useState } from "react";

import { formatToman } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartLineDto } from "@/server/services/cart.service";

import { TrashIcon } from "../icons";
import { MediaImage } from "../Placeholder";
import { QtyStepper } from "../QtyStepper";

/**
 * یک خط سبد (در مینی‌کارت و صفحه‌ی سبد). تغییر تعداد و حذف از طریق
 * callbackهای والد به سرور می‌رود؛ تا پاسخ برسد خط غیرفعال می‌ماند.
 */
export function CartLine({
  line,
  maxQuantity,
  onUpdate,
  onRemove,
  size = "md",
}: {
  line: CartLineDto;
  maxQuantity: number;
  onUpdate: (quantity: number) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  size?: "sm" | "md";
}) {
  const [pending, setPending] = useState(false);
  const href = `/products/${encodeURIComponent(line.productSlug)}`;
  const small = size === "sm";

  async function run(action: () => Promise<boolean>) {
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      aria-busy={pending}
      className={cn(
        "grid items-center gap-3 transition",
        small
          ? "grid-cols-[64px_1fr]"
          : "grid-cols-[82px_1fr] md:grid-cols-[106px_1fr_auto_160px] md:gap-5",
        pending && "opacity-60",
      )}
    >
      <Link
        href={href}
        className={cn(
          "relative block overflow-hidden rounded-[14px]",
          small ? "size-16" : "size-[82px] md:size-[106px]",
        )}
      >
        <MediaImage
          src={line.imageUrl}
          alt={line.productName}
          sizes="120px"
          placeholderSize=""
          placeholderLabel=""
          compact
        />
      </Link>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            className={cn(
              "hover:text-brand-strong truncate font-bold transition",
              small ? "text-sm" : "text-base md:text-lg",
            )}
          >
            {line.productName}
          </Link>
          <button
            type="button"
            onClick={() => run(onRemove)}
            disabled={pending}
            aria-label={`حذف ${line.productName} از سبد`}
            className={cn(
              "text-muted hover:text-danger shrink-0 transition",
              !small && "md:hidden",
            )}
          >
            <TrashIcon size={17} />
          </button>
        </div>
        <p className="text-muted text-xs md:text-[13px]">
          {line.variantTitle}
          {line.sku ? (
            <>
              {line.variantTitle ? " · کد " : "کد "}
              <span dir="ltr">{line.sku}</span>
            </>
          ) : null}
        </p>
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2",
            !small && "md:hidden",
          )}
        >
          <span className="text-sm font-bold">
            {formatToman(line.lineTotal)}{" "}
            <span className="text-muted text-xs font-medium">تومان</span>
          </span>
          <QtyStepper
            value={line.quantity}
            max={maxQuantity}
            size="sm"
            disabled={pending}
            onChange={(quantity) => run(() => onUpdate(quantity))}
          />
        </div>
      </div>

      {!small ? (
        <>
          <div className="hidden md:block">
            <QtyStepper
              value={line.quantity}
              max={maxQuantity}
              disabled={pending}
              onChange={(quantity) => run(() => onUpdate(quantity))}
            />
          </div>
          <div className="hidden flex-col items-end gap-2 md:flex">
            <span className="text-lg font-bold">
              {formatToman(line.lineTotal)}{" "}
              <span className="text-muted text-xs font-medium">تومان</span>
            </span>
            <button
              type="button"
              onClick={() => run(onRemove)}
              disabled={pending}
              className="text-muted hover:text-danger flex items-center gap-1.5 text-[13px] transition"
            >
              <TrashIcon size={15} />
              حذف
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
