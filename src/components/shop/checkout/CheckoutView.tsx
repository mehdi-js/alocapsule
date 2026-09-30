"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { priceOrder } from "@/lib/order-pricing";
import { isServedLocation, isShippingAvailableIn } from "@/lib/service-area";
import { cn } from "@/lib/utils";
import { placeOrderAction } from "@/server/actions/checkout";
import type { AddressDto } from "@/server/services/address.service";
import type { CheckoutViewDto } from "@/server/services/checkout.service";

import { useCart } from "../cart/CartProvider";
import { ArrowIcon } from "../icons";
import { panel, shopInput } from "../styles";
import type { AddressFormDefaults } from "./AddressForm";
import { AddressSection } from "./AddressSection";
import { CheckoutSteps } from "./CheckoutSteps";
import { CheckoutSummary } from "./CheckoutSummary";
import { PickupInfo } from "./PickupInfo";
import { ServiceConsent } from "./ServiceConsent";
import { ShippingOptions } from "./ShippingOptions";

const NOTE_MAX = 500;

/** آدرس پیش‌فرض قابل ارسال، وگرنه اولین آدرس قابل ارسال */
function pickAddress(addresses: AddressDto[]): string | null {
  const served = addresses.filter((a) => isServedLocation(a.province, a.city));
  return (served.find((a) => a.isDefault) ?? served[0])?.id ?? null;
}

/**
 * صفحه‌ی تسویه: آدرس، روش ارسال، توضیحات و خلاصه. مبلغ نمایش‌داده‌شده با همان
 * تابع خالص سرور (`priceOrder`) محاسبه می‌شود و سرور هنگام ثبت دوباره محاسبه
 * و مقایسه می‌کند.
 */
export function CheckoutView({
  initial,
  defaults,
}: {
  initial: CheckoutViewDto;
  defaults: AddressFormDefaults;
}) {
  const router = useRouter();
  const { refresh } = useCart();
  const toast = useToast();
  const [addresses, setAddresses] = useState(initial.addresses);
  const [addressId, setAddressId] = useState(() =>
    pickAddress(initial.addresses),
  );
  const [methodId, setMethodId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // داده‌ی تازه‌ی سرور (پس از revalidate یا refresh) منبع حقیقت است
  useEffect(() => setAddresses(initial.addresses), [initial.addresses]);

  const cart = initial.cart;
  const address =
    addresses.find(
      (a) => a.id === addressId && isServedLocation(a.province, a.city),
    ) ?? null;
  // روش بدون آدرس (تحویل حضوری) همیشه در دسترس است؛ بقیه به استان آدرس وابسته‌اند
  const methods = address
    ? initial.shippingMethods.filter(
        (m) =>
          !m.requiresAddress ||
          isShippingAvailableIn(m.provinces, address.province),
      )
    : initial.shippingMethods;
  const method = methods.find((m) => m.id === methodId) ?? methods[0] ?? null;
  const needsAddress = method?.requiresAddress ?? true;
  const needsConsent = cart.hasService && initial.service !== null;

  const coupon = cart.coupon && !cart.coupon.error ? cart.coupon : null;
  const itemsDiscount = coupon?.discount ?? 0;
  const pricing = method
    ? priceOrder({
        subtotal: cart.subtotal,
        itemsDiscount,
        freeShippingCoupon: coupon?.freeShipping ?? false,
        shipping: method,
        itemCount: cart.itemCount,
      })
    : null;

  const blocker = cart.coupon?.error
    ? "برای ادامه، مشکل کد تخفیف را در سبد خرید برطرف کنید."
    : !method
      ? "روش ارسالی در دسترس نیست."
      : needsAddress && !address
        ? "آدرس ارسال را انتخاب یا اضافه کنید."
        : needsConsent && !acceptedTerms
          ? "برای ثبت سفارش، شرایط تعویض کپسول را بپذیرید."
          : null;

  function handleAddresses(next: AddressDto[], selectId?: string) {
    setAddresses(next);
    if (selectId) setAddressId(selectId);
    else if (!next.some((a) => a.id === addressId)) {
      setAddressId(pickAddress(next));
    }
  }

  async function submit() {
    if (pending || blocker || !method || !pricing) return;
    setPending(true);
    setError(null);
    try {
      const result = await placeOrderAction({
        addressId: needsAddress ? (address?.id ?? null) : null,
        shippingMethodId: method.id,
        acceptServiceTerms: needsConsent && acceptedTerms,
        customerNote: note,
        expectedGrandTotal: pricing.grandTotal,
      });
      if (!result.ok) {
        setError(result.message);
        // اگر سبد خالی شد صفحه به /cart می‌رود؛ toast پیام را آنجا هم نگه می‌دارد
        toast.error(result.message);
        // سبد، قیمت یا کد ممکن است تغییر کرده باشد؛ خلاصه‌ی تازه نمایش داده شود
        router.refresh();
        return;
      }
      await refresh();
      router.push(
        `/checkout/success/${encodeURIComponent(result.orderNumber)}`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-5 pt-6 md:gap-8 md:px-11 md:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CheckoutSteps current={1} />
        <Link
          href="/cart"
          className="text-gold hover:text-gold-hover flex items-center gap-2 text-sm transition"
        >
          بازگشت به سبد خرید
          <ArrowIcon />
        </Link>
      </div>

      <h1 className="text-[28px] font-extrabold md:text-4xl">اطلاعات ارسال</h1>

      {cart.notices.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-2">
          {cart.notices.map((notice) => (
            <li
              key={notice}
              className="border-danger/40 bg-danger/10 text-danger rounded-[14px] border px-4 py-3 text-sm"
            >
              {notice}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_370px]">
        <div className="flex flex-col gap-5">
          <ShippingOptions
            methods={methods}
            selectedId={method?.id ?? null}
            onSelect={setMethodId}
            goodsAmount={cart.subtotal - itemsDiscount}
            itemCount={cart.itemCount}
            freeShippingCoupon={coupon?.freeShipping ?? false}
          />
          {needsAddress ? (
            <AddressSection
              addresses={addresses}
              selectedId={address?.id ?? null}
              defaults={defaults}
              onSelect={setAddressId}
              onAddressesChange={handleAddresses}
            />
          ) : (
            <PickupInfo
              address={initial.pickup.address}
              hours={initial.pickup.hours}
            />
          )}
          {needsConsent && initial.service ? (
            <ServiceConsent
              label={initial.service.consentLabel}
              terms={initial.service.terms}
              accepted={acceptedTerms}
              onChange={setAcceptedTerms}
            />
          ) : null}
          <section className={cn(panel, "flex flex-col gap-3 p-5 md:p-6")}>
            <label htmlFor="customer-note" className="text-lg font-extrabold">
              توضیحات سفارش{" "}
              <span className="text-muted text-sm font-medium">(اختیاری)</span>
            </label>
            <textarea
              id="customer-note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="مثلاً زمان مناسب تحویل یا توضیح برای بسته‌بندی"
              className={cn(shopInput, "resize-y leading-7")}
            />
          </section>
        </div>

        <CheckoutSummary
          cart={cart}
          pricing={pricing}
          payOnDelivery={method?.payOnDelivery ?? false}
          blocker={blocker}
          pending={pending}
          error={error}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
