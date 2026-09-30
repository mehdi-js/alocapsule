"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/image/config";
import { cn, toPersianDigits } from "@/lib/utils";

import { ShopField } from "../ShopField";
import { btnPrimary, shopInput } from "../styles";

const MAX_MB = toPersianDigits(MAX_IMAGE_BYTES / 1024 / 1024);

interface UploadResponse {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * فرم رسید کارت به کارت: فقط تصویر رسید. نوع و حجم فایل اینجا فقط برای
 * راحتی کاربر چک می‌شود؛ سرور با magic bytes دوباره بررسی می‌کند.
 */
export function ReceiptForm({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(next: File | null) {
    setErrors((current) => ({ ...current, file: "" }));
    if (next && !IMAGE_MIME_TYPES.includes(next.type)) {
      setErrors((current) => ({
        ...current,
        file: "فقط تصویر JPG، PNG یا WebP.",
      }));
      setFile(null);
      return;
    }
    if (next && next.size > MAX_IMAGE_BYTES) {
      setErrors((current) => ({
        ...current,
        file: `حجم تصویر حداکثر ${MAX_MB} مگابایت.`,
      }));
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!file) {
      setErrors({ file: "تصویر رسید را انتخاب کنید" });
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/receipt`,
        { method: "POST", body },
      );
      const result = (await response
        .json()
        .catch(() => ({ ok: false }))) as UploadResponse;
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(
          result.fieldErrors
            ? null
            : (result.message ?? "ثبت رسید ناموفق بود. دوباره تلاش کنید."),
        );
        return;
      }
      toast.success("رسید ثبت شد و پس از بررسی نتیجه اطلاع داده می‌شود.");
      router.refresh();
    } catch {
      setMessage(
        "ارتباط برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.",
      );
    } finally {
      setPending(false);
    }
  }

  const invalid = (key: string) => (errors[key] ? true : undefined);
  const describedBy = (key: string) =>
    errors[key] ? `receipt-${key}-error` : undefined;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-4"
    >
      <ShopField
        id="receipt-file"
        label="تصویر رسید"
        error={errors.file || undefined}
        hint={`JPG، PNG یا WebP تا ${MAX_MB} مگابایت`}
      >
        <input
          id="receipt-file"
          type="file"
          accept={IMAGE_MIME_TYPES.join(",")}
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          aria-invalid={invalid("file")}
          aria-describedby={describedBy("file")}
          className={cn(
            shopInput,
            "file:bg-accent file:text-on-accent file:me-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-sm file:font-bold",
          )}
        />
      </ShopField>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش blob محلی؛ next/image لازم نیست
        <img
          src={preview}
          alt="پیش‌نمایش رسید انتخاب‌شده"
          className="max-h-64 w-fit rounded-[14px] border border-control object-contain"
        />
      ) : null}

      {message ? (
        <p role="alert" className="text-danger text-sm leading-7">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(btnPrimary, "sm:w-fit")}
      >
        {pending ? "در حال ارسال رسید…" : "ثبت رسید پرداخت"}
      </button>
    </form>
  );
}
