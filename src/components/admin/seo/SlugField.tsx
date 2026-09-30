"use client";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

/**
 * نامک لاتین (SEO.md §۴.۲). در ویرایش، تغییر نامک هشدار می‌دهد که آدرس قبلی
 * خودکار به آدرس جدید ریدایرکت می‌شود.
 */
export function SlugField({
  value,
  originalSlug,
  pathPrefix,
  example,
  error,
  onChange,
}: {
  value: string;
  originalSlug: string | null;
  pathPrefix: string;
  example: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const changed = originalSlug !== null && value.trim() !== originalSlug;
  return (
    <div className="space-y-1.5">
      <Field
        label="نامک (slug) انگلیسی"
        htmlFor="slug"
        error={error}
        hint={`فقط حروف کوچک انگلیسی، عدد و خط تیره؛ مثلاً ${example}`}
        required
      >
        <Input
          id="slug"
          dir="ltr"
          value={value}
          placeholder={example}
          invalid={!!error}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
      <p dir="ltr" className="text-end text-xs text-neutral-500">
        {pathPrefix}
        {value.trim() || "…"}
      </p>
      {changed ? (
        <p
          role="status"
          className="rounded-md bg-amber-50 p-2 text-xs text-amber-800"
        >
          تغییر نامک، ریدایرکت خودکار از آدرس قبلی ({pathPrefix}
          {originalSlug}) می‌سازد.
        </p>
      ) : null}
    </div>
  );
}
