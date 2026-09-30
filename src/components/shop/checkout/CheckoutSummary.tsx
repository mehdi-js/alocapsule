"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatToman } from "@/lib/money";
import { type OrderPricing, PAY_ON_DELIVERY_LABEL } from "@/lib/order-pricing";
import { cn, toPersianDigits } from "@/lib/utils";
import type { CartViewDto } from "@/server/services/cart.service";

import { btnPrimary, panel } from "../styles";

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      {children}
    </div>
  );
}

/** خلاصه‌ی سفارش صفحه‌ی تسویه؛ مبلغ قطعی را سرور هنگام ثبت محاسبه می‌کند */
export function CheckoutSummary({
  cart,
  pricing,
  payOnDelivery,
  blocker,
  pending,
  error,
  onSubmit,
}: {
  cart: CartViewDto;
  /** `null` تا وقتی روش ارسال انتخاب نشده */
  pricing: OrderPricing | null;
  /** هزینه‌ی پیک درب منزل به پیک پرداخت می‌شود */
  payOnDelivery: boolean;
  /** دلیلی که ثبت را غیرممکن می‌کند (مثلاً آدرس انتخاب نشده) */
  blocker: string | null;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const coupon = cart.coupon;

  return (
    <aside
      aria-label="خلاصه سفارش"
      className={cn(panel, "flex flex-col gap-4 p-6 lg:sticky lg:top-5")}
    >
      <h2 className="text-lg font-extrabold">خلاصه سفارش</h2>

      <ul className="flex flex-col gap-2.5 border-b border-hair pb-4 text-sm">
        {cart.lines.map((line) => (
          <li key={line.variantId} className="flex justify-between gap-3">
            <span className="text-ink-soft min-w-0">
              {line.productName}{" "}
              <span className="text-muted">
                ({line.variantTitle}) × {toPersianDigits(line.quantity)}
              </span>
            </span>
            <span className="shrink-0">{formatToman(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-3 text-sm">
        <Row label={`جمع کالاها (${toPersianDigits(cart.itemCount)} عدد)`}>
          <dd className="font-bold">{formatToman(cart.subtotal)} تومان</dd>
        </Row>
        <Row label="هزینه ارسال">
          {pricing ? (
            payOnDelivery ? (
              <dd className="font-bold">{PAY_ON_DELIVERY_LABEL}</dd>
            ) : pricing.shippingTotal === 0 ? (
              <dd className="text-brand-strong font-bold">رایگان</dd>
            ) : (
              <dd className="font-bold">
                {formatToman(pricing.shippingTotal)} تومان
              </dd>
            )
          ) : (
            <dd className="text-muted text-xs">روش ارسال را انتخاب کنید</dd>
          )}
        </Row>
        {coupon && !coupon.error && pricing && pricing.discountTotal > 0 ? (
          <Row
            label={
              <>
                تخفیف{" "}
                <span dir="ltr" className="text-accent font-mono text-xs">
                  {coupon.code}
                </span>
              </>
            }
          >
            <dd className="text-accent font-bold">
              −{formatToman(pricing.discountTotal)} تومان
            </dd>
          </Row>
        ) : null}
      </dl>

      {coupon?.error ? (
        <p role="alert" className="text-danger text-sm leading-7">
          کد <span dir="ltr">{coupon.code}</span>: {coupon.error}{" "}
          <Link
            href="/cart"
            className="text-accent underline underline-offset-4"
          >
            اصلاح در سبد خرید
          </Link>
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-hair pt-4">
        <span className="font-bold">مبلغ قابل پرداخت</span>
        <span className="text-brand-strong text-2xl font-extrabold">
          {pricing ? formatToman(pricing.grandTotal) : "—"}{" "}
          <span className="text-ink-soft text-sm font-semibold">تومان</span>
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-danger text-sm leading-7">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || blocker !== null}
        className={cn(btnPrimary, "w-full")}
      >
        {pending ? "در حال ثبت سفارش…" : "ثبت سفارش"}
      </button>
      <p className="text-muted text-center text-xs leading-6">
        {blocker ??
          "پرداخت به‌صورت کارت به کارت است؛ پس از ثبت سفارش، مبلغ را واریز و رسید را بارگذاری می‌کنید."}
      </p>
    </aside>
  );
}
