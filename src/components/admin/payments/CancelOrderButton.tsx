"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatToman } from "@/lib/money";
import { cancelOrderAction } from "@/server/actions/payment-review";

import { ReasonDialog } from "./ReasonDialog";

/** لغو سفارش توسط ادمین؛ سفارش پرداخت‌شده ⇒ بازگشت کامل وجه به کیف پول */
export function CancelOrderButton({
  orderId,
  paid,
  amount,
}: {
  orderId: string;
  paid: boolean;
  amount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm(reason: string) {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId, reason);
      if (!result.ok) {
        if (result.fieldErrors) {
          setError(result.fieldErrors.reason ?? result.message);
          return;
        }
        toast.error(result.message);
      } else if (result.changed) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        className="text-red-600"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {paid ? "لغو سفارش و بازگشت وجه" : "لغو سفارش"}
      </Button>
      <ReasonDialog
        key={open ? "open" : "closed"}
        open={open}
        title={paid ? "لغو سفارش و بازگشت وجه" : "لغو سفارش"}
        description={
          paid
            ? `مبلغ ${formatToman(amount)} تومان به کیف پول مشتری برمی‌گردد و کد تخفیف سفارش آزاد می‌شود. این کار برگشت‌پذیر نیست.`
            : "سفارش لغو و کد تخفیف آن آزاد می‌شود. این کار برگشت‌پذیر نیست."
        }
        confirmLabel="لغو سفارش"
        loading={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
