import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CheckoutSteps } from "@/components/shop/checkout/CheckoutSteps";
import { BankCards } from "@/components/shop/payment/BankCards";
import { CopyButton } from "@/components/shop/payment/CopyButton";
import { ReceiptForm } from "@/components/shop/payment/ReceiptForm";
import { WalletPay } from "@/components/shop/payment/WalletPay";
import { btnOutline, panel } from "@/components/shop/styles";
import { formatJalali } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { cn, safeDecode, toPersianDigits } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  getPaymentPage,
  type PaymentPageDto,
} from "@/server/services/payment-page.service";

export const metadata: Metadata = {
  title: "پرداخت سفارش",
  robots: { index: false },
};

function Banner({
  tone,
  children,
}: {
  tone: "info" | "danger" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-[18px] border px-5 py-4 text-sm leading-7",
        tone === "danger" && "border-danger/40 bg-danger/10 text-danger",
        tone === "success" &&
          "border-brand-strong/40 bg-brand-strong/10 text-ink",
        tone === "info" && "border-outline bg-accent/8",
      )}
    >
      {children}
    </div>
  );
}

/** پیام وضعیت فعلی پرداخت برای مشتری */
function StatusBanner({ page }: { page: PaymentPageDto }) {
  const last = page.lastPayment;
  switch (page.status) {
    case "PAYMENT_REVIEW":
      return (
        <Banner tone="info">
          رسید شما ثبت شد و در حال بررسی است؛ پس از تأیید، سفارش آماده و ارسال
          می‌شود.
          {last?.referenceNumber ? (
            <span className="text-muted block">
              شماره‌ی پیگیری {toPersianDigits(last.referenceNumber)}
              {` · کارت ****${toPersianDigits(last.payerCardLast4 ?? "")}`}
              {last.paidAtClaimed
                ? ` · واریز ${formatJalali(last.paidAtClaimed)}`
                : ""}
            </span>
          ) : null}
        </Banner>
      );
    case "PAYMENT_REJECTED":
      return (
        <Banner tone="danger">
          رسید قبلی شما تأیید نشد
          {last?.rejectReason
            ? `: ${last.rejectReason.replace(/[.。]$/, "")}.`
            : "."}{" "}
          لطفاً رسید صحیح را دوباره بارگذاری کنید.
        </Banner>
      );
    case "CANCELED":
      return <Banner tone="danger">این سفارش لغو شده است.</Banner>;
    case "PENDING_PAYMENT":
      return null;
    default:
      return (
        <Banner tone="success">
          پرداخت این سفارش تأیید شده است · وضعیت: {page.statusLabel}
        </Banner>
      );
  }
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(panel, "flex flex-col gap-4 p-5 md:p-6")}>
      <h2 className="flex items-center gap-3 text-lg font-extrabold">
        <span className="bg-brand-strong text-on-brand flex size-7 items-center justify-center rounded-full text-xs">
          {toPersianDigits(index)}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** پرداخت سفارش: کارت به کارت + رسید، یا کیف پول (فقط صاحب سفارش). */
export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const orderNumber = safeDecode((await params).orderNumber);
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/checkout/pay/${encodeURIComponent(orderNumber)}`);
  }
  const page = await getPaymentPage(orderNumber, user.id);
  if (!page) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-5 pt-6 md:gap-7 md:pt-8">
      <CheckoutSteps current={2} />

      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold md:text-4xl">پرداخت سفارش</h1>
        <p className="text-muted text-sm">
          سفارش{" "}
          <span dir="ltr" className="text-accent font-mono font-bold">
            {page.orderNumber}
          </span>{" "}
          · {page.statusLabel}
        </p>
      </header>

      <StatusBanner page={page} />

      <div
        className={cn(
          panel,
          "flex flex-wrap items-center justify-between gap-3 p-5 md:p-6",
        )}
      >
        <span className="font-bold">مبلغ قابل پرداخت</span>
        <span className="flex items-center gap-3">
          <span className="text-brand-strong text-2xl font-extrabold md:text-3xl">
            {formatToman(page.grandTotal)}{" "}
            <span className="text-ink-soft text-sm font-semibold">تومان</span>
          </span>
          {page.canPay ? (
            <CopyButton value={String(page.grandTotal)} label="کپی مبلغ" />
          ) : null}
        </span>
      </div>

      {page.canPay ? (
        <>
          <Step index={1} title="مبلغ را به این کارت واریز کنید">
            <BankCards cards={page.bankCards} />
          </Step>
          <Step index={2} title="رسید واریز را بارگذاری کنید">
            <ReceiptForm orderNumber={page.orderNumber} />
          </Step>
          {page.walletBalance > 0 ? (
            <section className={cn(panel, "flex flex-col gap-3 p-5 md:p-6")}>
              <h2 className="text-lg font-extrabold">یا پرداخت از کیف پول</h2>
              <WalletPay
                orderNumber={page.orderNumber}
                balance={page.walletBalance}
                amount={page.grandTotal}
              />
            </section>
          ) : null}
        </>
      ) : null}

      <div className="flex justify-center">
        <Link href="/products" className={btnOutline}>
          بازگشت به فروشگاه
        </Link>
      </div>
    </div>
  );
}
