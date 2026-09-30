"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/image/config";
import { cn, toPersianDigits } from "@/lib/utils";
import {
  deleteImageAction,
  reorderImagesAction,
  setPrimaryImageAction,
  updateImageAltAction,
} from "@/server/actions/product-image";
import type { ProductImageDto } from "@/server/services/product-image.service";

import { ImageAltInput } from "./ImageAltInput";
import { ImageUploadZone } from "./ImageUploadZone";

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/**
 * مدیریت تصاویر محصول با اعمال فوری (مثل کلیدهای فعال/غیرفعال):
 * آپلود چندتایی، ترتیب با drag & drop (یا دکمه‌های ←/→)، انتخاب تصویر اصلی و حذف.
 */
export function ProductImages({
  productId,
  initialImages,
  onImagesChange,
}: {
  productId: string;
  initialImages: ProductImageDto[];
  /** اطلاع به فرم (تحلیل سئو: alt و تصویر اصلی) */
  onImagesChange?: (images: ProductImageDto[]) => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState(initialImages);
  useEffect(() => onImagesChange?.(items), [items, onImagesChange]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ProductImageDto | null>(null);
  const [isPending, startTransition] = useTransition();

  /** تغییر خوش‌بینانه؛ در خطای سرور به وضعیت قبل برمی‌گردد. */
  function apply(
    next: ProductImageDto[],
    run: () => Promise<{ ok: boolean; message?: string }>,
    successMessage?: string,
  ) {
    const previous = items;
    setItems(next);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setItems(previous);
        toast.error(result.message ?? "خطای غیرمنتظره رخ داد.");
        return;
      }
      if (successMessage) toast.success(successMessage);
    });
  }

  function reorder(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return;
    const next = move(items, from, to).map((image, sortOrder) => ({
      ...image,
      sortOrder,
    }));
    apply(next, () =>
      reorderImagesAction(
        productId,
        next.map((i) => i.id),
      ),
    );
  }

  function makePrimary(image: ProductImageDto) {
    apply(
      items.map((item) => ({ ...item, isPrimary: item.id === image.id })),
      () => setPrimaryImageAction(image.id),
      "تصویر اصلی تغییر کرد.",
    );
  }

  function saveAlt(image: ProductImageDto, alt: string) {
    apply(
      items.map((item) => (item.id === image.id ? { ...item, alt } : item)),
      () => updateImageAltAction(image.id, alt),
      "متن جایگزین ذخیره شد.",
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    const remaining = items.filter((item) => item.id !== target.id);
    // اگر تصویر اصلی حذف شود، اولین تصویر باقی‌مانده اصلی می‌شود (مثل سرور).
    const next = target.isPrimary
      ? remaining.map((item, index) => ({ ...item, isPrimary: index === 0 }))
      : remaining;
    apply(next, () => deleteImageAction(target.id), "تصویر حذف شد.");
  }

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">تصاویر محصول</h2>
        <span className="text-sm text-neutral-500">
          {toPersianDigits(items.length)} از{" "}
          {toPersianDigits(MAX_IMAGES_PER_PRODUCT)}
        </span>
      </div>
      <p className="text-sm text-neutral-600">
        تغییرات این بخش فوراً اعمال می‌شود (نیازی به «ذخیره‌ی تغییرات» نیست).
        تصویر اصلی در لیست‌ها و ابتدای گالری نمایش داده می‌شود؛ برای تغییر
        ترتیب، تصاویر را بکشید.
      </p>
      <p className="text-sm text-neutral-600">
        برای هر تصویر یک «متن جایگزین» توصیفی بنویسید (مثلاً «برش باقلوا گردویی
        روی سینی مسی»)؛ برای گوگل و نابینایان است. همان کلمه‌ی کلیدی را در همه‌ی
        تصاویر تکرار نکنید.
      </p>

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((image, index) => (
            <li
              key={image.id}
              draggable={!isPending}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "space-y-2 rounded-lg border p-2",
                image.isPrimary ? "border-neutral-900" : "border-neutral-200",
                dragIndex === index && "opacity-50",
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-100">
                <Image
                  src={image.thumbUrl}
                  alt={image.alt}
                  fill
                  sizes="200px"
                  unoptimized
                  draggable={false}
                  className="object-cover"
                />
                {image.isPrimary ? (
                  <span className="absolute start-1 top-1 rounded bg-neutral-900 px-2 py-0.5 text-xs text-white">
                    اصلی
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="انتقال به قبل"
                    disabled={index === 0 || isPending}
                    onClick={() => reorder(index, index - 1)}
                  >
                    →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="انتقال به بعد"
                    disabled={index === items.length - 1 || isPending}
                    onClick={() => reorder(index, index + 1)}
                  >
                    ←
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  disabled={isPending}
                  onClick={() => setDeleting(image)}
                >
                  حذف
                </Button>
              </div>
              <ImageAltInput
                key={`${image.id}-${image.alt}`}
                id={`alt-${image.id}`}
                value={image.alt}
                disabled={isPending}
                onSave={(alt) => saveAlt(image, alt)}
              />
              {!image.isPrimary ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => makePrimary(image)}
                >
                  تصویر اصلی
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ImageUploadZone
        productId={productId}
        remaining={MAX_IMAGES_PER_PRODUCT - items.length}
        onUploaded={(image) => setItems((current) => [...current, image])}
      />

      <ConfirmDialog
        open={deleting !== null}
        destructive
        title="حذف تصویر"
        confirmLabel="حذف"
        description="این تصویر برای همیشه حذف می‌شود."
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}
