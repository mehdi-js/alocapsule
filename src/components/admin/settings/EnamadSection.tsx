"use client";

import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { enamadUrls, parseEnamadCode } from "@/lib/enamad";

import { Section } from "./SettingsSections";

/** کد اینماد + پیش‌نمایش نماد (همان‌که در فوتر نمایش داده می‌شود) */
export function EnamadSection({
  value,
  error,
  onChange,
}: {
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const seal = value.trim() ? parseEnamadCode(value) : null;
  return (
    <Section
      title="نماد اعتماد الکترونیکی (اینماد)"
      hint="کد HTML که اینماد برای درج در سایت می‌دهد را کامل این‌جا بچسبانید؛ نماد در فوتر همه‌ی صفحات نمایش داده می‌شود. خالی = بدون نماد."
    >
      <div className="grid items-start gap-4 md:grid-cols-[1fr_auto]">
        <Field label="کد اینماد" htmlFor="enamad" error={error}>
          <Textarea
            id="enamad"
            dir="ltr"
            rows={4}
            value={value}
            placeholder="<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=…&Code=…'>…</a>"
            onChange={(event) => onChange(event.target.value)}
            className="font-mono text-xs"
          />
        </Field>
        <div className="flex min-h-28 min-w-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 p-3 text-center text-xs text-neutral-500">
          {seal ? (
            <>
              {/* تصویر اینماد باید مستقیم از دامنه‌ی خودش و با referrer بارگذاری شود */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enamadUrls(seal).logo}
                alt="نماد اعتماد الکترونیکی"
                referrerPolicy="origin"
                width={96}
                height={96}
                className="h-24 w-24 object-contain"
              />
              <span dir="ltr">id {seal.id}</span>
            </>
          ) : value.trim() ? (
            <span className="text-red-600">کد شناخته نشد</span>
          ) : (
            <span>پیش‌نمایش نماد</span>
          )}
        </div>
      </div>
      <p className="text-xs leading-6 text-neutral-500">
        اینماد نماد را فقط روی دامنه‌ی ثبت‌شده نشان می‌دهد؛ روی localhost ممکن
        است تصویر خالی یا خطا باشد.
      </p>
    </Section>
  );
}
