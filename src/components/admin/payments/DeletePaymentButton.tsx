"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deletePaymentAction } from "@/server/actions/order-admin";

/** حذف پرداخت ردشده/بی‌استفاده (سفارش می‌ماند) */
export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deletePaymentAction(paymentId);
      if (!result.ok) {
        toast.error(result.message);
        setOpen(false);
        return;
      }
      toast.success("پرداخت حذف شد.");
      router.push(`/admin/orders/${result.orderId}`);
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        className="text-red-600"
        onClick={() => setOpen(true)}
      >
        حذف این پرداخت
      </Button>
      <ConfirmDialog
        open={open}
        title="حذف پرداخت"
        description="این پرداخت و تصویر رسیدش برای همیشه حذف می‌شود؛ سفارش باقی می‌ماند. ادامه می‌دهید؟"
        confirmLabel="حذف دائمی"
        destructive
        loading={pending}
        onConfirm={remove}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
