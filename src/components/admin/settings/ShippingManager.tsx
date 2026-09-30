"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatToman } from "@/lib/money";
import { PAY_ON_DELIVERY_LABEL } from "@/lib/order-pricing";
import { toPersianDigits } from "@/lib/utils";
import { deleteShippingMethodAction } from "@/server/actions/settings";

import { MethodForm, type ShippingRow } from "./ShippingMethodForm";

export type { ShippingRow };

/** روش‌های ارسال صفحه‌ی تسویه */
export function ShippingManager({ methods }: { methods: ShippingRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ShippingRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ShippingRow | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {methods.every((method) => !method.isActive) ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          هیچ روش ارسال فعالی نیست؛ مشتری نمی‌تواند سفارش ثبت کند.
        </p>
      ) : null}
      <Button onClick={() => setEditing("new")}>روش ارسال جدید</Button>
      <Table>
        <THead>
          <tr>
            <TH>نام</TH>
            <TH>هزینه</TH>
            <TH>رایگان از</TH>
            <TH>استان‌ها</TH>
            <TH>وضعیت</TH>
            <TH>
              <span className="sr-only">عملیات</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {methods.map((method) => (
            <TR key={method.id}>
              <TD>{method.name}</TD>
              <TD className="whitespace-nowrap">
                {method.payOnDelivery
                  ? PAY_ON_DELIVERY_LABEL
                  : `${formatToman(method.cost)} تومان`}
              </TD>
              <TD className="whitespace-nowrap">
                {method.freeAboveAmount
                  ? `${formatToman(method.freeAboveAmount)} تومان`
                  : "—"}
              </TD>
              <TD>
                {method.provinces.length ? method.provinces.join("، ") : "همه"}
              </TD>
              <TD>{method.isActive ? "فعال" : "غیرفعال"}</TD>
              <TD className="whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(method)}
                >
                  ویرایش
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setDeleting(method)}
                >
                  حذف
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <p className="text-xs text-neutral-500">
        {toPersianDigits(methods.length)} روش ارسال · سفارش‌های ثبت‌شده نام روش
        را نگه می‌دارند و با حذف آن تغییری نمی‌کنند.
      </p>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "روش ارسال جدید" : "ویرایش روش ارسال"}
      >
        {editing !== null ? (
          <MethodForm
            key={editing === "new" ? "new" : editing.id}
            method={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="حذف روش ارسال"
        description={`«${deleting?.name ?? ""}» حذف شود؟ برای توقف موقت، آن را غیرفعال کنید.`}
        confirmLabel="حذف"
        destructive
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleting) return;
            const result = await deleteShippingMethodAction(deleting.id);
            if (result.ok) toast.success("روش ارسال حذف شد.");
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
