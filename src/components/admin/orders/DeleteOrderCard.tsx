"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { toLatinDigits } from "@/lib/utils";
import { deleteOrderAction } from "@/server/actions/order-admin";

/**
 * حذف دائمی سفارش (منطقه‌ی خطر). برای جلوگیری از حذف اشتباه، شماره‌ی
 * سفارش باید تایپ شود.
 */
export function DeleteOrderCard({
  orderId,
  orderNumber,
  paid,
}: {
  orderId: string;
  orderNumber: string;
  paid: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = toLatinDigits(typed).trim().toUpperCase() === orderNumber;

  function remove() {
    startTransition(async () => {
      const result = await deleteOrderAction(orderId, orderNumber);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`سفارش ${orderNumber} حذف شد.`);
      router.push("/admin/orders");
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="font-bold text-red-700">حذف سفارش</h2>
      <p className="text-sm leading-7 text-neutral-700">
        سفارش با اقلام، پرداخت‌ها، رسیدها و تاریخچه‌اش برای همیشه حذف می‌شود و
        از گزارش‌ها هم کنار می‌رود. این کار برگشت‌پذیر نیست.
      </p>
      <Button
        variant="danger"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
      >
        حذف دائمی سفارش
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`حذف سفارش ${orderNumber}`}
      >
        <div className="space-y-4 text-sm leading-7">
          <ul className="list-disc space-y-1 ps-5 text-neutral-700">
            <li>
              اقلام، پرداخت‌ها، تصویر رسیدها و تاریخچه‌ی وضعیت حذف می‌شوند.
            </li>
            <li>اگر کد تخفیف داشته، استفاده‌اش آزاد می‌شود.</li>
            <li>
              تراکنش‌های کیف پول مشتری <strong>باقی می‌مانند</strong> (پولی که
              جابه‌جا شده واقعی است).
              {paid
                ? " اگر می‌خواهید مبلغ به کیف پول مشتری برگردد، اول سفارش را لغو کنید و بعد حذف کنید."
                : null}
            </li>
            <li>
              خلاصه‌ی سفارش در لاگ ممیزی می‌ماند و شماره‌اش دوباره استفاده
              نمی‌شود.
            </li>
          </ul>
          <Field
            label={`برای تأیید، شماره‌ی سفارش (${orderNumber}) را بنویسید`}
            htmlFor="confirm-order-number"
          >
            <Input
              id="confirm-order-number"
              dir="ltr"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              disabled={!matches}
              loading={pending}
              onClick={remove}
            >
              حذف دائمی
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
