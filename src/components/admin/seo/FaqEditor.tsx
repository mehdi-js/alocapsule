"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { toPersianDigits } from "@/lib/utils";
import { MAX_FAQ_ITEMS } from "@/lib/validation/seo";

import { type FaqRow, newFaqRow } from "./seo-form-state";

/** ویرایشگر سوالات متداول: افزودن، حذف و جابه‌جایی */
export function FaqEditor({
  rows,
  onChange,
  error,
}: {
  rows: FaqRow[];
  onChange: (rows: FaqRow[]) => void;
  error: (field: string) => string | undefined;
}) {
  function update(index: number, patch: Partial<FaqRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold">سوالات متداول</h3>
        <p className="text-xs text-neutral-500">
          زیر توضیحات صفحه نمایش داده می‌شود. فقط پاسخ‌های واقعی بنویسید.
        </p>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="space-y-3 rounded-lg border border-neutral-200 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              سوال {toPersianDigits(index + 1)}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="بالا بردن سوال"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="پایین بردن سوال"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                حذف
              </Button>
            </div>
          </div>
          <Field
            label="سوال"
            htmlFor={`faq-${row.key}-q`}
            error={error(`faq.${index}.question`)}
          >
            <Input
              id={`faq-${row.key}-q`}
              value={row.question}
              invalid={!!error(`faq.${index}.question`)}
              onChange={(event) =>
                update(index, { question: event.target.value })
              }
            />
          </Field>
          <Field
            label="پاسخ"
            htmlFor={`faq-${row.key}-a`}
            error={error(`faq.${index}.answer`)}
          >
            <Textarea
              id={`faq-${row.key}-a`}
              rows={3}
              value={row.answer}
              invalid={!!error(`faq.${index}.answer`)}
              onChange={(event) =>
                update(index, { answer: event.target.value })
              }
            />
          </Field>
        </div>
      ))}
      {rows.length < MAX_FAQ_ITEMS ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...rows, newFaqRow()])}
        >
          افزودن سوال
        </Button>
      ) : null}
    </div>
  );
}
