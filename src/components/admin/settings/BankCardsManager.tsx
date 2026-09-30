"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatCardNumber } from "@/lib/payment";
import { parseIntegerInput, toPersianDigits } from "@/lib/utils";
import {
  deleteBankCardAction,
  saveBankCardAction,
} from "@/server/actions/settings";

export interface BankCardRow {
  id: string;
  bankName: string;
  cardNumber: string;
  shebaNumber: string | null;
  accountHolderName: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY = {
  bankName: "",
  cardNumber: "",
  shebaNumber: "",
  accountHolderName: "",
  isActive: true,
  sortOrder: "0",
};

type FormValues = typeof EMPTY;

function CardForm({
  card,
  onDone,
}: {
  card: BankCardRow | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(
    card
      ? {
          ...card,
          shebaNumber: card.shebaNumber ?? "",
          sortOrder: String(card.sortOrder),
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = (key: keyof FormValues, value: string | boolean) =>
    setValues((v) => ({ ...v, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveBankCardAction(card?.id ?? null, {
        ...values,
        sortOrder: parseIntegerInput(values.sortOrder) ?? 0,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("کارت ذخیره شد.");
      onDone();
    });
  }

  const text = (key: keyof FormValues, label: string, ltr = false) => (
    <Field label={label} htmlFor={`card-${key}`} error={errors[key]}>
      <Input
        id={`card-${key}`}
        value={String(values[key])}
        onChange={(e) => set(key, e.target.value)}
        dir={ltr ? "ltr" : undefined}
        invalid={Boolean(errors[key])}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {text("bankName", "نام بانک")}
      {text("cardNumber", "شماره کارت (۱۶ رقم)", true)}
      {text("shebaNumber", "شماره شبا (اختیاری، IR…)", true)}
      {text("accountHolderName", "نام صاحب حساب")}
      {text("sortOrder", "ترتیب نمایش", true)}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
        <span className="text-sm">
          فعال (در صفحه‌ی پرداخت مشتری نمایش داده شود)
        </span>
        <Switch
          checked={values.isActive}
          onChange={(checked) => set("isActive", checked)}
          label="کارت فعال"
        />
      </div>
      <Button type="submit" loading={pending}>
        ذخیره
      </Button>
    </form>
  );
}

/** کارت‌های بانکی کارت به کارت (فقط کارت‌های فعال به مشتری نشان داده می‌شوند) */
export function BankCardsManager({ cards }: { cards: BankCardRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<BankCardRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<BankCardRow | null>(null);
  const [pending, startTransition] = useTransition();

  const done = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {cards.every((card) => !card.isActive) ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          هیچ کارت فعالی نیست؛ مشتری نمی‌تواند کارت به کارت پرداخت کند.
        </p>
      ) : null}
      <Button onClick={() => setEditing("new")}>کارت جدید</Button>
      <Table>
        <THead>
          <tr>
            <TH>بانک</TH>
            <TH>شماره کارت</TH>
            <TH>صاحب حساب</TH>
            <TH>وضعیت</TH>
            <TH>ترتیب</TH>
            <TH>
              <span className="sr-only">عملیات</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {cards.map((card) => (
            <TR key={card.id}>
              <TD>{card.bankName}</TD>
              <TD dir="ltr" className="text-start font-mono">
                {formatCardNumber(card.cardNumber)}
              </TD>
              <TD>{card.accountHolderName}</TD>
              <TD>{card.isActive ? "فعال" : "غیرفعال"}</TD>
              <TD>{toPersianDigits(card.sortOrder)}</TD>
              <TD className="whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(card)}
                >
                  ویرایش
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setDeleting(card)}
                >
                  حذف
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "کارت جدید" : "ویرایش کارت"}
      >
        {editing !== null ? (
          <CardForm
            key={editing === "new" ? "new" : editing.id}
            card={editing === "new" ? null : editing}
            onDone={done}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="حذف کارت"
        description={`کارت ${deleting?.bankName ?? ""} حذف شود؟ برای توقف موقت، کارت را غیرفعال کنید.`}
        confirmLabel="حذف"
        destructive
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleting) return;
            const result = await deleteBankCardAction(deleting.id);
            if (result.ok) toast.success("کارت حذف شد.");
            else toast.error(result.message);
            setDeleting(null);
            router.refresh();
          })
        }
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
