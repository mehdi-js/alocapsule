"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

/** مودال گرفتن دلیل (رد رسید یا لغو سفارش)؛ دلیل به مشتری هم نمایش داده می‌شود */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm(reason);
  }

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm leading-7 text-neutral-700">{description}</p>
        <Field
          label="دلیل"
          htmlFor="review-reason"
          error={error ?? undefined}
          required
        >
          <Textarea
            id="review-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            invalid={Boolean(error)}
            aria-describedby={error ? "review-reason-error" : undefined}
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            انصراف
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
