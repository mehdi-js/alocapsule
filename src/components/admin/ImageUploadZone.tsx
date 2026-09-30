"use client";

import { type DragEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  IMAGE_MIME_TYPES,
  INVALID_IMAGE_MESSAGE,
  MAX_IMAGE_BYTES,
} from "@/lib/image/config";
import { cn, toPersianDigits } from "@/lib/utils";
import type { ProductImageDto } from "@/server/services/product-image.service";

interface UploadEntry {
  id: number;
  name: string;
  status: "uploading" | "error";
  message?: string;
}

let entryCounter = 0;

/** پیش‌بررسی سریع در مرورگر؛ مرجع نهایی سرور است (magic bytes). */
function precheck(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) {
    return `حجم فایل بیشتر از ${toPersianDigits(MAX_IMAGE_BYTES / 1024 / 1024)} مگابایت است.`;
  }
  if (!IMAGE_MIME_TYPES.includes(file.type)) return INVALID_IMAGE_MESSAGE;
  return null;
}

async function uploadOne(
  productId: string,
  file: File,
): Promise<{ image?: ProductImageDto; message?: string }> {
  const body = new FormData();
  body.set("productId", productId);
  body.set("file", file);
  try {
    const response = await fetch("/api/upload/product-image", {
      method: "POST",
      body,
    });
    const data = (await response.json()) as {
      ok: boolean;
      message?: string;
      image?: ProductImageDto;
    };
    return data.ok && data.image
      ? { image: data.image }
      : { message: data.message ?? "آپلود ناموفق بود." };
  } catch {
    return { message: "ارتباط با سرور برقرار نشد." };
  }
}

/** انتخاب/رهاکردن فایل‌ها و آپلود پشت‌سرهم (یکی‌یکی) */
export function ImageUploadZone({
  productId,
  remaining,
  onUploaded,
}: {
  productId: string;
  /** چند تصویر دیگر می‌توان اضافه کرد */
  remaining: number;
  onUploaded: (image: ProductImageDto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const busy = entries.some((entry) => entry.status === "uploading");

  function patchEntry(id: number, update: Partial<UploadEntry>) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    );
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    let room = remaining;
    // خطاهای قبلی پاک می‌شوند؛ فایل‌های جدید یکی‌یکی آپلود می‌شوند.
    setEntries([]);

    for (const file of files) {
      const id = ++entryCounter;
      // خطای خود فایل (نوع/حجم) مهم‌تر از پر بودن ظرفیت است.
      const error =
        precheck(file) ??
        (room <= 0 ? "سقف تعداد تصاویر این محصول پر شده است." : null);
      if (error) {
        setEntries((current) => [
          ...current,
          { id, name: file.name, status: "error", message: error },
        ]);
        continue;
      }

      setEntries((current) => [
        ...current,
        { id, name: file.name, status: "uploading" },
      ]);
      const result = await uploadOne(productId, file);
      if (result.image) {
        room -= 1; // ظرفیت فقط با آپلود موفق مصرف می‌شود
        onUploaded(result.image);
        setEntries((current) => current.filter((entry) => entry.id !== id));
      } else {
        patchEntry(id, { status: "error", message: result.message });
      }
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    if (busy || remaining <= 0 || event.dataTransfer.files.length === 0) return;
    void handleFiles(event.dataTransfer.files);
  }

  const isFileDrag = (event: DragEvent) =>
    event.dataTransfer.types.includes("Files");

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
          isDragOver
            ? "border-neutral-900 bg-neutral-100"
            : "border-neutral-300",
        )}
      >
        <p className="text-sm text-neutral-600">
          تصاویر را اینجا رها کنید یا انتخاب کنید (JPG، PNG یا WebP — حداکثر{" "}
          {toPersianDigits(MAX_IMAGE_BYTES / 1024 / 1024)} مگابایت برای هر
          تصویر)
        </p>
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy || remaining <= 0}
          loading={busy}
        >
          {busy ? "در حال آپلود…" : "انتخاب تصویر"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={IMAGE_MIME_TYPES.join(",")}
          className="sr-only"
          aria-label="انتخاب فایل تصویر"
          onChange={(event) => {
            if (event.target.files?.length)
              void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {entries.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                entry.status === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-neutral-100 text-neutral-700",
              )}
              role={entry.status === "error" ? "alert" : undefined}
            >
              <span dir="ltr" className="truncate">
                {entry.name}
              </span>
              <span>
                {entry.status === "uploading" ? "در حال آپلود…" : entry.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
