"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatToman } from "@/lib/money";
import {
  approvePaymentAction,
  rejectPaymentAction,
} from "@/server/actions/payment-review";

import { ReasonDialog } from "./ReasonDialog";

/** تأیید / رد رسید. نتیجه‌ی «قبلاً انجام شده» هم پیام عادی است، نه خطا. */
export function PaymentReviewActions({
  paymentId,
  amount,
}: {
  paymentId: string;
  amount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish(result: Awaited<ReturnType<typeof approvePaymentAction>>) {
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
    setDialog(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => setDialog("approve")} disabled={pending}>
        تأیید پرداخت
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          setError(null);
          setDialog("reject");
        }}
        disabled={pending}
      >
        رد رسید
      </Button>

      <ConfirmDialog
        open={dialog === "approve"}
        title="تأیید پرداخت"
        description={`واریز ${formatToman(amount)} تومان با رسید مطابقت دارد؟ پس از تأیید، سفارش به «در حال آماده‌سازی» می‌رود.`}
        confirmLabel="بله، تأیید شود"
        loading={pending}
        onConfirm={() =>
          startTransition(async () =>
            finish(await approvePaymentAction(paymentId)),
          )
        }
        onCancel={() => setDialog(null)}
      />
      <ReasonDialog
        key={dialog === "reject" ? "open" : "closed"}
        open={dialog === "reject"}
        title="رد رسید"
        description="دلیل رد به مشتری نمایش داده می‌شود تا رسید صحیح را دوباره بفرستد. کد تخفیف سفارش آزاد نمی‌شود."
        confirmLabel="رد رسید"
        loading={pending}
        error={error}
        onConfirm={(reason) =>
          startTransition(async () =>
            finish(await rejectPaymentAction(paymentId, reason)),
          )
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
