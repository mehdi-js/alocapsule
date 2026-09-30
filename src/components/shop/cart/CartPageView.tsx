"use client";

import Link from "next/link";
import { useEffect } from "react";

import { formatToman } from "@/lib/money";
import { SITE } from "@/lib/site-content";
import { cn, toPersianDigits } from "@/lib/utils";
import type { CartViewDto } from "@/server/services/cart.service";

import { CheckoutSteps } from "../checkout/CheckoutSteps";
import { ArrowIcon, CartIcon } from "../icons";
import { btnPrimary, panel } from "../styles";
import { CartLine } from "./CartLine";
import { useCart } from "./CartProvider";
import { CouponBox } from "./CouponBox";

/**
 * صفحه‌ی سبد. نمای اولیه از سرور می‌آید و تغییرات از CartProvider (که هم
 * نشانگر هدر را به‌روز می‌کند). مهمان با «ادامه و ثبت سفارش» به ورود می‌رود
 * (middleware) و پس از ورود سبدش ادغام می‌شود.
 */
export function CartPageView({ initial }: { initial: CartViewDto }) {
  const { cart: live, replace, update, remove } = useCart();

  // نمای سرور منبع تازه‌تری است؛ context را هم با آن هم‌گام می‌کنیم
  useEffect(() => replace(initial), [initial, replace]);

  const cart = live ?? initial;
  const freeShipping = Boolean(cart.coupon?.freeShipping && !cart.coupon.error);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-5 pt-6 md:gap-8 md:px-11 md:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CheckoutSteps current={0} />
        <Link
          href="/products"
          className="text-gold hover:text-gold-hover flex items-center gap-2 text-sm transition"
        >
          ادامه خرید
          <ArrowIcon />
        </Link>
      </div>

      <h1 className="text-[28px] font-extrabold md:text-4xl">
        سبد خرید
        {cart.itemCount > 0 ? (
          <span className="text-muted ms-3 text-base font-medium">
            {toPersianDigits(cart.itemCount)} عدد
          </span>
        ) : null}
      </h1>

      {initial.notices.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-2">
          {initial.notices.map((notice) => (
            <li
              key={notice}
              className="rounded-[14px] border border-[#E06B5B]/40 bg-[#E06B5B]/10 px-4 py-3 text-sm text-[#E06B5B]"
            >
              {notice}
            </li>
          ))}
        </ul>
      ) : null}

      {cart.lines.length === 0 ? (
        <div
          className={cn(
            panel,
            "flex flex-col items-center gap-5 px-6 py-20 text-center",
          )}
        >
          <span className="bg-card text-gold flex size-16 items-center justify-center rounded-full">
            <CartIcon size={28} />
          </span>
          <p className="text-xl font-extrabold">سبد خرید شما خالی است</p>
          <p className="text-muted text-sm">
            محصولات {SITE.name} را ببینید و بسته‌ی مورد علاقه‌تان را انتخاب
            کنید.
          </p>
          <Link href="/products" className={btnPrimary}>
            مشاهده محصولات
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_370px]">
          <div className="flex flex-col gap-3.5">
            <ul className="flex flex-col gap-3.5">
              {cart.lines.map((line) => (
                <li
                  key={line.variantId}
                  className={cn(panel, "rounded-[20px] p-3.5 md:p-4.5")}
                >
                  <CartLine
                    line={line}
                    maxQuantity={cart.maxQuantity}
                    onUpdate={(quantity) => update(line.variantId, quantity)}
                    onRemove={() => remove(line.variantId)}
                  />
                </li>
              ))}
            </ul>
            <CouponBox cart={cart} />
          </div>

          <aside
            aria-label="خلاصه سفارش"
            className={cn(panel, "flex flex-col gap-4 p-6 lg:sticky lg:top-5")}
          >
            <h2 className="text-lg font-extrabold">خلاصه سفارش</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">
                  جمع کالاها ({toPersianDigits(cart.itemCount)} عدد)
                </dt>
                <dd className="font-bold">
                  {formatToman(cart.subtotal)} تومان
                </dd>
              </div>
              {cart.discountTotal > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">تخفیف</dt>
                  <dd className="text-gold font-bold">
                    −{formatToman(cart.discountTotal)} تومان
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">هزینه ارسال</dt>
                {freeShipping ? (
                  <dd className="text-action font-bold">رایگان</dd>
                ) : (
                  <dd className="text-muted text-xs">
                    در مرحله‌ی ارسال محاسبه می‌شود
                  </dd>
                )}
              </div>
            </dl>
            <div className="flex items-center justify-between gap-3 border-t border-[rgb(201_168_118/0.14)] pt-4">
              <span className="font-bold">جمع پس از تخفیف</span>
              <span className="text-action text-2xl font-extrabold">
                {formatToman(cart.total)}{" "}
                <span className="text-ink-2 text-sm font-semibold">تومان</span>
              </span>
            </div>
            <Link href="/checkout" className={cn(btnPrimary, "w-full")}>
              ادامه و ثبت سفارش
            </Link>
            <p className="text-muted text-center text-xs leading-6">
              پرداخت به‌صورت کارت به کارت؛ هزینه‌ی ارسال در مرحله‌ی بعد محاسبه
              می‌شود.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
