"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteCouponAction } from "@/server/actions/coupon";

export function DeleteCouponButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteCouponAction(id);
      setOpen(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("کد تخفیف حذف شد.");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600"
        onClick={() => setOpen(true)}
      >
        حذف
      </Button>
      <ConfirmDialog
        open={open}
        destructive
        loading={isPending}
        title="حذف کد تخفیف"
        confirmLabel="حذف"
        description={
          <>
            کد «<span dir="ltr">{code}</span>» حذف شود؟ کدی که در سفارشی استفاده
            شده حذف نمی‌شود؛ آن را غیرفعال کنید.
          </>
        }
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
