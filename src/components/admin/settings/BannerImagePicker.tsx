"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import type { BannerImages, BannerVariant } from "@/lib/banners";
import { IMAGE_MIME_TYPES } from "@/lib/image/config";
import { cn, toPersianDigits } from "@/lib/utils";

const VARIANT_LABELS: Record<BannerVariant, string> = {
  desktop: "نسخه‌ی دسکتاپ",
  mobile: "نسخه‌ی موبایل",
};

async function upload(file: File, variant: BannerVariant): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("variant", variant);
  const response = await fetch("/api/upload/banner-image", {
    method: "POST",
    body,
  });
  const result = (await response.json().catch(() => null)) as {
    ok: boolean;
    url?: string;
    message?: string;
  } | null;
  if (!result?.ok || !result.url) {
    throw new Error(result?.message ?? "آپلود تصویر ناموفق بود.");
  }
  return result.url;
}

/** «1000 × 800» ⇒ «عرض ۱۰۰۰ × ارتفاع ۸۰۰ پیکسل» (بدون ابهام در راست‌به‌چپ) */
function sizeLabel(size: string): string {
  const [w, h] = size.split("×").map((part) => part.trim());
  return `پیشنهادی: عرض ${toPersianDigits(w ?? "")} × ارتفاع ${toPersianDigits(h ?? "")} پیکسل`;
}

/** «1000 × 800» ⇒ نسبت CSS برای کادر پیش‌نمایش */
function aspect(size: string): string {
  const [w, h] = size.split("×").map((part) => Number(part.trim()));
  return w && h ? `${w} / ${h}` : "16 / 9";
}

function VariantPicker({
  variant,
  url,
  size,
  fallback,
  onChange,
}: {
  variant: BannerVariant;
  url: string | null;
  size: string;
  /** نسخه‌ی موبایل خالی ⇒ همان دسکتاپ نمایش داده می‌شود */
  fallback: string | null;
  onChange: (url: string | null) => void;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const shown = url ?? fallback;

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await upload(file, variant));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{VARIANT_LABELS[variant]}</span>
        <span className="text-xs text-neutral-500">{sizeLabel(size)}</span>
      </div>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50",
          variant === "mobile" ? "max-w-48" : "w-full",
        )}
        style={{ aspectRatio: aspect(size) }}
      >
        {shown ? (
          // پیش‌نمایش همان فایل WebP ذخیره‌شده
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className={cn("h-full w-full object-cover", !url && "opacity-50")}
          />
        ) : (
          <span className="px-2 text-center text-xs text-neutral-400">
            بدون تصویر
          </span>
        )}
        {!url && fallback ? (
          <span className="absolute bottom-1 rounded bg-white/90 px-1.5 text-[10px] text-neutral-600">
            از نسخه‌ی دسکتاپ
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label
          className={cn(
            "cursor-pointer font-medium underline underline-offset-4",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? "در حال آپلود…" : url ? "تغییر تصویر" : "انتخاب تصویر"}
          <input
            type="file"
            accept={IMAGE_MIME_TYPES.join(",")}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              void pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {url ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-red-600 hover:underline"
          >
            حذف
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * دو نسخه‌ی یک بنر: دسکتاپ (کادر پهن) و موبایل (کادر تقریباً مربع). نسخه‌ی
 * موبایل اختیاری است؛ خالی ⇒ نسخه‌ی دسکتاپ با برش وسط.
 */
export function BannerImagePicker({
  images,
  sizes,
  onChange,
}: {
  images: BannerImages;
  sizes: { desktop: string; mobile: string };
  onChange: (images: BannerImages) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <VariantPicker
        variant="desktop"
        url={images.desktop}
        size={sizes.desktop}
        fallback={null}
        onChange={(desktop) => onChange({ ...images, desktop })}
      />
      <VariantPicker
        variant="mobile"
        url={images.mobile}
        size={sizes.mobile}
        fallback={images.desktop}
        onChange={(mobile) => onChange({ ...images, mobile })}
      />
    </div>
  );
}
