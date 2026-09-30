"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { cancelMyOrderAction } from "@/server/actions/account";

import { btnOutline } from "../styles";

/** لغو سفارش پرداخت‌نشده توسط مشتری (با تأیید درون‌خطی) */
export function CancelMyOrder({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function cancel() {
    setPending(true);
    try {
      const result = await cancelMyOrderAction(orderNumber);
      if (result.ok) toast.success("سفارش لغو شد.");
      else toast.error(result.message);
      router.refresh();
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(btnOutline, "hover:text-danger")}
      >
        لغو سفارش
      </button>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
      <span>سفارش لغو شود؟ این کار برگشت‌پذیر نیست.</span>
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="text-danger font-bold"
      >
        {pending ? "در حال لغو…" : "بله، لغو شود"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-gold"
      >
        انصراف
      </button>
    </div>
  );
}
