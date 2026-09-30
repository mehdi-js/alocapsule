import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CheckoutSteps } from "@/components/shop/checkout/CheckoutSteps";
import { CheckIcon } from "@/components/shop/icons";
import { btnOutline, btnPrimary, panel } from "@/components/shop/styles";
import { formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { shippingCostLabel } from "@/lib/order-pricing";
import { cn, safeDecode, toPersianDigits } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current-user";
import { getOrderConfirmation } from "@/server/services/order-query.service";

export const metadata: Metadata = {
  title: "سفارش ثبت شد",
  robots: { index: false },
};

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("font-bold", className)}>{value}</dd>
    </div>
  );
}

/** صفحه‌ی موفقیت سفارش؛ فقط صاحب سفارش آن را می‌بیند. */
export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber: raw } = await params;
  const orderNumber = safeDecode(raw);
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/login?next=/checkout/success/${encodeURIComponent(orderNumber)}`,
    );
  }

  const order = await getOrderConfirmation(orderNumber, user.id);
  if (!order) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-5 pt-6 md:gap-8 md:pt-8">
      <CheckoutSteps current={2} />

      <section
        className={cn(
          panel,
          "flex flex-col items-center gap-4 px-6 py-10 text-center",
        )}
      >
        <span className="bg-action text-action-ink flex size-16 items-center justify-center rounded-full">
          <CheckIcon size={30} />
        </span>
        <h1 className="text-2xl font-extrabold md:text-3xl">
          سفارش شما ثبت شد
        </h1>
        <p className="text-muted">
          شماره‌ی پیگیری سفارش:{" "}
          <span dir="ltr" className="text-gold font-mono text-lg font-bold">
            {order.orderNumber}
          </span>
        </p>
        <p className="text-ink-2 max-w-md text-sm leading-7">
          وضعیت سفارش: <strong>{order.statusLabel}</strong>. مبلغ{" "}
          <strong className="text-action">
            {formatToman(order.grandTotal)} تومان
          </strong>{" "}
          را به‌صورت کارت به کارت پرداخت و رسید را بارگذاری کنید؛ پس از تأیید
          پرداخت، سفارش آماده و ارسال می‌شود.
        </p>
        <Link
          href={`/checkout/pay/${encodeURIComponent(order.orderNumber)}`}
          className={btnPrimary}
        >
          {order.status === "PENDING_PAYMENT" ||
          order.status === "PAYMENT_REJECTED"
            ? "پرداخت و بارگذاری رسید"
            : "مشاهده‌ی وضعیت پرداخت"}
        </Link>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={cn(panel, "flex flex-col gap-4 p-6")}>
          <h2 className="text-lg font-extrabold">اقلام سفارش</h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {item.productName}{" "}
                  <span className="text-muted">
                    ({item.variantTitle}) × {toPersianDigits(item.quantity)}
                  </span>
                </span>
                <span className="shrink-0">{formatToman(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2.5 border-t border-[rgb(201_168_118/0.14)] pt-4 text-sm">
            <SummaryRow
              label="جمع کالاها"
              value={`${formatToman(order.subtotal)} تومان`}
            />
            <SummaryRow
              label={`ارسال (${order.shippingMethodName})`}
              value={shippingCostLabel(
                order.shippingTotal,
                order.shippingPayOnDelivery,
              )}
            />
            {order.discountTotal > 0 ? (
              <SummaryRow
                label={`تخفیف${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`−${formatToman(order.discountTotal)} تومان`}
                className="text-gold"
              />
            ) : null}
            <SummaryRow
              label="مبلغ قابل پرداخت"
              value={`${formatToman(order.grandTotal)} تومان`}
              className="text-action text-base"
            />
          </dl>
        </section>

        <section className={cn(panel, "flex flex-col gap-3 p-6 text-sm")}>
          <h2 className="text-lg font-extrabold">ارسال به</h2>
          {order.address ? (
            <>
              <p className="font-bold">
                {order.address.receiverName}{" "}
                <span dir="ltr" className="text-ink-2 font-medium">
                  {toPersianDigits(order.address.receiverPhone)}
                </span>
              </p>
              <p className="text-ink-2 leading-7">
                {order.address.province}، {order.address.city}،{" "}
                {order.address.line}
                {order.address.postalCode
                  ? ` · کد پستی ${toPersianDigits(order.address.postalCode)}`
                  : ""}
              </p>
            </>
          ) : null}
          {order.customerNote ? (
            <p className="text-muted leading-7">
              توضیحات: {order.customerNote}
            </p>
          ) : null}
          <p className="text-muted">
            ثبت: {formatJalaliDateTime(order.placedAt)}
          </p>
        </section>
      </div>

      <div className="flex justify-center">
        <Link href="/products" className={btnOutline}>
          بازگشت به فروشگاه
        </Link>
      </div>
    </div>
  );
}
