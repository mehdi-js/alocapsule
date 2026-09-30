"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { shipOrderAction } from "@/server/actions/order-admin";

/** ثبت کد رهگیری و انتقال به «ارسال شد» (پیامک ارسال به مشتری) */
export function ShipOrderForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await shipOrderAction(orderId, trackingCode);
      if (!result.ok) {
        setError(result.fieldErrors?.trackingCode ?? result.message);
        return;
      }
      setError(null);
      toast.success(
        "سفارش ارسال شد و پیامک کد رهگیری برای مشتری فرستاده می‌شود.",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field
        label="کد رهگیری"
        htmlFor="tracking-code"
        error={error ?? undefined}
        hint="کد رهگیری پست، یا نام و شماره‌ی پیک"
        required
      >
        <Input
          id="tracking-code"
          value={trackingCode}
          onChange={(event) => setTrackingCode(event.target.value)}
          invalid={Boolean(error)}
          aria-describedby={error ? "tracking-code-error" : undefined}
          maxLength={60}
          autoComplete="off"
        />
      </Field>
      <Button type="submit" loading={pending}>
        ثبت ارسال
      </Button>
    </form>
  );
}
