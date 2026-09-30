"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  deleteProductPermanentlyAction,
  restoreProductAction,
} from "@/server/actions/product";

/** برای محصول بایگانی‌شده: بازگردانی یا حذف دائمی (فقط بدون سفارش) */
export function ArchivedProductActions({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(
    action: () => ReturnType<typeof restoreProductAction>,
    message: string,
  ) {
    startTransition(async () => {
      const result = await action();
      setConfirming(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() =>
          run(
            () => restoreProductAction(productId),
            "محصول از بایگانی خارج شد (غیرفعال است؛ برای نمایش، فعالش کنید).",
          )
        }
      >
        بازگردانی
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600"
        onClick={() => setConfirming(true)}
      >
        حذف دائمی
      </Button>
      <ConfirmDialog
        open={confirming}
        destructive
        loading={isPending}
        title="حذف دائمی محصول"
        confirmLabel="حذف دائمی"
        description={
          <>
            «{productName}» و تصاویرش برای همیشه حذف می‌شود. آدرسش همچنان به
            همان مقصد بایگانی ریدایرکت می‌ماند. محصولی که در سفارشی استفاده شده
            حذف دائمی نمی‌شود.
          </>
        }
        onConfirm={() =>
          run(
            () => deleteProductPermanentlyAction(productId),
            "محصول برای همیشه حذف شد.",
          )
        }
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
