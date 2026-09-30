"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { archiveProductAction } from "@/server/actions/product";
import type { ArchiveTarget } from "@/server/services/product-query.service";

export interface ArchiveTargets {
  categories: ArchiveTarget[];
  products: (ArchiveTarget & { id: string })[];
}

/**
 * «حذف» محصول = بایگانی (SEO.md §۴.۳): محصول از سایت برداشته می‌شود و آدرسش
 * با 301 به مقصد انتخابی (پیش‌فرض دسته‌ی محصول) می‌رود.
 */
export function ArchiveProductButton({
  productId,
  productName,
  categorySlug,
  targets,
}: {
  productId: string;
  productName: string;
  categorySlug: string;
  targets: ArchiveTargets;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(`/category/${categorySlug}`);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await archiveProductAction(productId, target);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setOpen(false);
      toast.success("محصول بایگانی شد و آدرسش ریدایرکت می‌شود.");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-red-600"
      >
        حذف
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="حذف (بایگانی) محصول"
      >
        <div className="space-y-5 text-sm leading-7">
          <p>
            محصول «{productName}» از سایت و لیست‌ها برداشته می‌شود، ولی برای حفظ
            رتبه‌ی گوگل و لینک‌های قبلی، آدرسش به صفحه‌ی انتخابی زیر ریدایرکت
            (301) می‌شود. سفارش‌های قبلی دست نمی‌خورند و بعداً می‌توانید آن را
            از بایگانی خارج کنید.
          </p>
          <Field label="مقصد ریدایرکت" htmlFor={`archive-target-${productId}`}>
            <Select
              id={`archive-target-${productId}`}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              <optgroup label="دسته‌ها">
                {targets.categories.map((option) => (
                  <option key={option.path} value={option.path}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="محصولات">
                {targets.products
                  .filter((option) => option.id !== productId)
                  .map((option) => (
                    <option key={option.path} value={option.path}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            </Select>
          </Field>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirm}
              loading={isPending}
            >
              بایگانی
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
