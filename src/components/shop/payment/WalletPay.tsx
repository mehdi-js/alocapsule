"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { formatToman } from "@/lib/money";
import { cn } from "@/lib/utils";
import { payWithWalletAction } from "@/server/actions/payment";

import { btnOutline, btnPrimary } from "../styles";

/** پرداخت کل مبلغ سفارش از کیف پول (فقط اگر موجودی کافی باشد) */
export function WalletPay({
  orderNumber,
  balance,
  amount,
}: {
  orderNumber: string;
  balance: number;
  amount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const enough = balance >= amount;

  async function pay() {
    setPending(true);
    try {
      const result = await payWithWalletAction(orderNumber);
      if (!result.ok) {
        toast.error(result.message);
        router.refresh();
        return;
      }
      toast.success("پرداخت از کیف پول انجام شد و سفارش شما تأیید شد.");
      router.refresh();
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        موجودی کیف پول شما:{" "}
        <strong className="text-action">{formatToman(balance)} تومان</strong>
      </p>
      {!enough ? (
        <p className="text-muted text-sm">
          موجودی برای پرداخت کل مبلغ این سفارش کافی نیست؛ لطفاً کارت به کارت
          پرداخت کنید.
        </p>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            {formatToman(amount)} تومان از کیف پول کسر شود؟
          </span>
          <button
            type="button"
            onClick={pay}
            disabled={pending}
            className={cn(btnPrimary, "py-2.5")}
          >
            {pending ? "در حال پرداخت…" : "بله، پرداخت شود"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className={cn(btnOutline, "py-2.5")}
          >
            انصراف
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={cn(btnOutline, "sm:w-fit")}
        >
          پرداخت از کیف پول
        </button>
      )}
    </div>
  );
}
