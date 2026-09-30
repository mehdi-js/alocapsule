"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatToman } from "@/lib/money";
import { parseIntegerInput } from "@/lib/utils";
import { adjustWalletAction } from "@/server/actions/user-admin";

type AdjustType = "CREDIT" | "DEBIT";

/**
 * شارژ/کسر دستی کیف پول با یادداشت اجباری. هر ارسال یک `requestId` یکتا
 * دارد؛ کلیک دوباره روی «تأیید» تراکنش دوم نمی‌سازد.
 */
export function WalletAdjustForm({
  userId,
  balance,
}: {
  userId: string;
  balance: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<AdjustType>("CREDIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const parsedAmount = parseIntegerInput(amount);

  function review(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!parsedAmount || parsedAmount < 1) next.amount = "مبلغ را وارد کنید";
    if (note.trim().length < 3) next.note = "یادداشت (دلیل تغییر) را بنویسید";
    setErrors(next);
    if (Object.keys(next).length === 0) setConfirming(true);
  }

  function submit() {
    startTransition(async () => {
      const result = await adjustWalletAction(userId, {
        type,
        amount: parsedAmount,
        note,
        requestId,
      });
      setConfirming(false);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(
        result.changed
          ? `موجودی جدید: ${formatToman(result.balance)} تومان`
          : "این تغییر قبلاً ثبت شده بود.",
      );
      setAmount("");
      setNote("");
      setErrors({});
      setRequestId(crypto.randomUUID());
      router.refresh();
    });
  }

  return (
    <form onSubmit={review} className="space-y-4" noValidate>
      <p className="text-sm text-neutral-600">
        موجودی فعلی: <strong>{formatToman(balance)} تومان</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نوع" htmlFor="wallet-type">
          <Select
            id="wallet-type"
            value={type}
            onChange={(e) => setType(e.target.value as AdjustType)}
          >
            <option value="CREDIT">افزایش (شارژ)</option>
            <option value="DEBIT">کاهش (کسر)</option>
          </Select>
        </Field>
        <Field
          label="مبلغ (تومان)"
          htmlFor="wallet-amount"
          error={errors.amount}
          hint={parsedAmount ? `${formatToman(parsedAmount)} تومان` : undefined}
          required
        >
          <Input
            id="wallet-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            dir="ltr"
            invalid={Boolean(errors.amount)}
          />
        </Field>
      </div>
      <Field
        label="یادداشت (دلیل تغییر)"
        htmlFor="wallet-note"
        error={errors.note}
        hint="در سابقه و گزارش ممیزی ثبت می‌شود و به مشتری نمایش داده نمی‌شود."
        required
      >
        <Textarea
          id="wallet-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          invalid={Boolean(errors.note)}
        />
      </Field>
      <Button type="submit" variant={type === "DEBIT" ? "danger" : "primary"}>
        {type === "CREDIT" ? "شارژ کیف پول" : "کسر از کیف پول"}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={type === "CREDIT" ? "شارژ کیف پول" : "کسر از کیف پول"}
        description={`${formatToman(parsedAmount ?? 0)} تومان ${
          type === "CREDIT" ? "به موجودی اضافه" : "از موجودی کم"
        } شود؟ این تغییر در دفتر کیف پول و گزارش ممیزی ثبت می‌شود.`}
        confirmLabel="تأیید"
        destructive={type === "DEBIT"}
        loading={pending}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
