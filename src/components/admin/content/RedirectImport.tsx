"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { toPersianDigits } from "@/lib/utils";
import { importRedirectsAction } from "@/server/actions/content";

/**
 * ورود گروهی CSV (`from,to,status`) — نقشه‌ی مهاجرت از وردپرس
 * (SEO.md §۱۱.۳). فایل انتخاب یا متن چسبانده می‌شود.
 */
export function RedirectImport() {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [isPending, startTransition] = useTransition();

  async function readFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
  }

  function submit() {
    setErrors([]);
    startTransition(async () => {
      const result = await importRedirectsAction(text);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setErrors(result.errors);
      if (result.saved > 0) {
        toast.success(
          `${toPersianDigits(result.saved)} ریدایرکت ذخیره شد (حداکثر تا یک دقیقه اعمال می‌شود).`,
        );
        router.refresh();
      }
      if (result.errors.length > 0) {
        toast.error(
          `${toPersianDigits(result.errors.length)} سطر ذخیره نشد؛ فهرست خطاها را ببینید.`,
        );
      } else {
        setText("");
      }
    });
  }

  return (
    <details className="rounded-xl border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer font-bold">ورود گروهی از CSV</summary>
      <div className="mt-4 space-y-3 text-sm">
        <p className="text-neutral-600">
          ستون‌ها: <code dir="ltr">from,to,status</code> — status یکی از 301 یا
          410 (خالی = 301). ردیفی با همان مبدأ به‌روز می‌شود. سطر عنوان اختیاری
          است.
        </p>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => void readFile(event.target.files?.[0])}
        />
        <Textarea
          dir="ltr"
          rows={6}
          value={text}
          placeholder={
            "from,to,status\n/product/old-name,/products/baklava-gerdouyi,301\n/old-page,,410"
          }
          onChange={(event) => setText(event.target.value)}
        />
        <Button onClick={submit} loading={isPending} disabled={!text.trim()}>
          ورود
        </Button>
        {errors.length > 0 ? (
          <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-red-800">
            {errors.map((item) => (
              <li key={`${item.line}-${item.message}`}>
                سطر {toPersianDigits(item.line)}: {item.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
