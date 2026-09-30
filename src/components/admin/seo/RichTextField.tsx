"use client";

import { useState } from "react";

import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { RichText } from "@/components/ui/RichText";

/** فیلد متن بلند با راهنمای قالب‌بندی ساده و پیش‌نمایش */
export function RichTextField({
  id,
  label,
  value,
  onChange,
  error,
  rows = 8,
  headingLevel = 2,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
  headingLevel?: 2 | 3;
  hint?: string;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="space-y-2">
      <Field label={label} htmlFor={id} error={error} hint={hint}>
        {preview ? (
          <div className="min-h-32 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <RichText text={value} headingLevel={headingLevel} />
          </div>
        ) : (
          <Textarea
            id={id}
            rows={rows}
            value={value}
            invalid={!!error}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-neutral-500">
        <details>
          <summary className="cursor-pointer">راهنمای قالب‌بندی</summary>
          <ul className="mt-2 space-y-1 leading-6" dir="rtl">
            <li>خط خالی ⇒ پاراگراف جدید</li>
            <li>
              <code>## عنوان</code> ⇒ سرتیتر، <code>### عنوان</code> ⇒ سرتیتر
              فرعی
            </li>
            <li>
              <code>- مورد</code> ⇒ فهرست، <code>**متن**</code> ⇒ پررنگ
            </li>
            <li>
              <code>[محصول نمونه](/products/example-product)</code> ⇒ لینک داخلی
            </li>
          </ul>
        </details>
        <button
          type="button"
          className="font-medium underline underline-offset-4"
          onClick={() => setPreview((current) => !current)}
        >
          {preview ? "ویرایش" : "پیش‌نمایش"}
        </button>
      </div>
    </div>
  );
}
