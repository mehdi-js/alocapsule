"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { formatToman } from "@/lib/money";
import type { CartViewDto } from "@/server/services/cart.service";

import { CloseIcon } from "../icons";
import { useCart } from "./CartProvider";

const boxClass =
  "flex flex-col gap-3 rounded-[20px] border border-dashed border-outline p-4.5";

/** کارت کد تخفیف صفحه‌ی سبد (طبق طراحی: کادر خط‌چین طلایی). */
export function CouponBox({ cart }: { cart: CartViewDto }) {
  const { applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cart.canUseCoupon) {
    return (
      <div className={boxClass}>
        <p className="text-sm font-bold">کد تخفیف دارید؟</p>
        <p className="text-muted text-sm">
          برای استفاده از کد تخفیف{" "}
          <Link
            href="/login?next=/cart"
            className="text-accent underline underline-offset-4"
          >
            وارد حساب خود شوید
          </Link>
          .
        </p>
      </div>
    );
  }

  const applied = cart.coupon;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await applyCoupon(code);
      if (result.ok) setCode("");
      else setError(result.message ?? "کد تخفیف معتبر نیست.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await removeCoupon();
    } finally {
      setPending(false);
    }
  }

  if (applied) {
    return (
      <div className={boxClass} aria-busy={pending}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm">
              کد{" "}
              <span dir="ltr" className="text-accent font-mono font-bold">
                {applied.code}
              </span>
              {applied.title ? (
                <span className="text-muted"> — {applied.title}</span>
              ) : null}
            </p>
            {applied.error ? (
              <p role="alert" className="text-danger text-sm">
                {applied.error}
              </p>
            ) : applied.freeShipping ? (
              <p className="text-brand-strong text-sm">
                ارسال سفارش شما رایگان است.
              </p>
            ) : (
              <p className="text-brand-strong text-sm">
                {applied.description} · {formatToman(applied.discount)} تومان
                تخفیف
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="حذف کد تخفیف"
            className="text-muted hover:text-danger shrink-0 transition"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={boxClass} noValidate>
      <label htmlFor="coupon-code" className="text-sm font-bold">
        کد تخفیف دارید؟
      </label>
      <div className="bg-card flex items-center gap-2 rounded-full border border-control py-1.5 ps-4 pe-1.5 focus-within:border-strong">
        <input
          id="coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="کد تخفیف را وارد کنید"
          dir="ltr"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "coupon-error" : undefined}
          className="placeholder:text-faint min-w-0 flex-1 bg-transparent py-1.5 text-start font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case"
        />
        <button
          type="submit"
          disabled={pending || code.trim() === ""}
          className="bg-accent hover:bg-accent-hover text-surface-alt rounded-full px-5 py-2 text-sm font-bold transition disabled:opacity-50"
        >
          {pending ? "…" : "اعمال"}
        </button>
      </div>
      {error ? (
        <p id="coupon-error" role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
