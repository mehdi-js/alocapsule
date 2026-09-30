"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { retryNotificationAction } from "@/server/actions/notification";
import { markDeliveredAction } from "@/server/actions/order-admin";

export function MarkDeliveredButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button onClick={() => setOpen(true)}>تحویل شد</Button>
      <ConfirmDialog
        open={open}
        title="تحویل سفارش"
        description="سفارش به مشتری تحویل شده است؟"
        confirmLabel="بله، تحویل شد"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await markDeliveredAction(orderId);
            if (result.ok) toast.success("وضعیت سفارش «تحویل شد» شد.");
            else toast.error(result.message);
            setOpen(false);
            router.refresh();
          })
        }
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

/** تلاش دوباره‌ی دستی پیامک ناموفق (سقف ۳ تلاش رعایت می‌شود) */
export function RetryNotificationButton({ logId }: { logId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryNotificationAction(logId);
          if (!result.ok) toast.error(result.message);
          else if (!result.retried) {
            toast.error("این پیامک دیگر قابل تلاش دوباره نیست.");
          }
          router.refresh();
        })
      }
    >
      تلاش دوباره
    </Button>
  );
}
