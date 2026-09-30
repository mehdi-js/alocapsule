"use client";

import type { ReactNode } from "react";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * فهرستی از کارت‌های چندفیلدی (مثل عنوان/زیرعنوان نوار اعتماد، آمار یا
 * شعب). خطاها با کلید `name.index.field` از سرور می‌آیند. `actions`
 * دکمه‌های هر کارت (مثل حذف یا جابه‌جایی) را کنار عنوانش می‌گذارد.
 */
export function PairList<K extends string>({
  name,
  items,
  legends,
  fields,
  errors,
  onChange,
  columns,
  actions,
}: {
  name: string;
  items: Record<K, string>[];
  legends: string[];
  fields: { key: K; label: string }[];
  errors: Record<string, string>;
  onChange: (items: Record<K, string>[]) => void;
  columns: string;
  actions?: (index: number) => ReactNode;
}) {
  return (
    <div className={`grid gap-4 ${columns}`}>
      {items.map((item, index) => (
        <fieldset
          key={index}
          className="space-y-3 rounded-lg border border-neutral-200 p-3"
        >
          <legend className="px-1 text-xs text-neutral-500">
            {legends[index]}
          </legend>
          {actions ? (
            <div className="-mt-2 flex justify-end gap-1">{actions(index)}</div>
          ) : null}
          {fields.map(({ key, label }) => {
            const id = `${name}.${index}.${key}`;
            return (
              <Field key={key} label={label} htmlFor={id} error={errors[id]}>
                <Input
                  id={id}
                  value={item[key]}
                  invalid={Boolean(errors[id])}
                  aria-describedby={errors[id] ? `${id}-error` : undefined}
                  onChange={(event) =>
                    onChange(
                      items.map((current, i) =>
                        i === index
                          ? { ...current, [key]: event.target.value }
                          : current,
                      ),
                    )
                  }
                />
              </Field>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
