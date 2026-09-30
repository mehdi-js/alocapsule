"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  ALLOWED_VARIABLES,
  DEFAULT_TEMPLATES,
  DEFAULT_VARIABLES,
  MAX_VARIABLES,
  renderTemplate,
  SMS_LABELS,
  type SmsType,
  templateError,
  type VariableKey,
  VARIABLES,
} from "@/lib/notification-templates";
import { toPersianDigits } from "@/lib/utils";

export interface SmsTypeState {
  template: string;
  variables: VariableKey[];
  pattern: string;
}

const HINTS: Partial<Record<SmsType, string>> = {
  OTP: "به همه‌ی کاربران هنگام ورود/ثبت‌نام",
  ADMIN_RECEIPT_SUBMITTED: "به شماره‌ی مدیر",
  ADMIN_WALLET_PAID: "به شماره‌ی مدیر",
};

/**
 * یک پیامک: متن (همان متن تأییدشده در ملی پیامک)، ترتیب متغیرها
 * (`{0}`، `{1}`، …)، شناسه‌ی الگو و پیش‌نمایش زنده.
 */
export function SmsTypeCard({
  type,
  value,
  onChange,
  envPattern,
  provider,
  errors,
}: {
  type: SmsType;
  value: SmsTypeState;
  onChange: (next: SmsTypeState) => void;
  envPattern: string;
  provider: string;
  errors: Record<string, string>;
}) {
  const allowed = ALLOWED_VARIABLES[type];
  const templateId = `template-${type}`;
  const patternId = `pattern-${type}`;
  const templateErr = errors[`templates.${type}`];
  const variablesErr = errors[`variables.${type}`];
  const patternErr = errors[`patterns.${type}`];
  const effective = value.pattern.trim() || envPattern;
  // خطای زنده‌ی ناهمخوانی متن و متغیرها، پیش از ذخیره
  const liveError = templateError(value.template, value.variables.length);
  const preview = renderTemplate(
    value.template,
    value.variables.map((key) => VARIABLES[key].sample),
  );

  function setVariables(variables: VariableKey[]) {
    onChange({ ...value, variables });
  }

  function move(index: number, delta: number) {
    const next = [...value.variables];
    const target = index + delta;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setVariables(next);
  }

  const unused = allowed.filter((key) => !value.variables.includes(key));

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">{SMS_LABELS[type]}</h2>
          {HINTS[type] ? (
            <p className="text-xs text-neutral-500">{HINTS[type]}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!effective && provider === "melipayamak" ? (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700">
              شناسه‌ی الگو تنظیم نشده؛ ارسال ناموفق می‌شود
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                template: DEFAULT_TEMPLATES[type],
                variables: [...DEFAULT_VARIABLES[type]],
              })
            }
          >
            متن پیش‌فرض
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">ترتیب متغیرها</p>
        <ol className="space-y-2">
          {value.variables.map((key, index) => (
            <li key={`${key}-${index}`} className="flex items-center gap-2">
              <span
                dir="ltr"
                className="w-10 shrink-0 rounded-md bg-neutral-100 py-1.5 text-center font-mono text-sm"
              >{`{${index}}`}</span>
              <Select
                aria-label={`متغیر ${toPersianDigits(index)}`}
                value={key}
                onChange={(event) => {
                  const next = [...value.variables];
                  next[index] = event.target.value as VariableKey;
                  setVariables(next);
                }}
                className="max-w-56"
              >
                {allowed.map((option) => (
                  <option
                    key={option}
                    value={option}
                    disabled={
                      option !== key && value.variables.includes(option)
                    }
                  >
                    {VARIABLES[option].label}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="sm"
                aria-label="بالا"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="پایین"
                disabled={index === value.variables.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                aria-label="حذف متغیر"
                onClick={() =>
                  setVariables(value.variables.filter((_, i) => i !== index))
                }
              >
                ✕
              </Button>
            </li>
          ))}
        </ol>
        {unused.length > 0 && value.variables.length < MAX_VARIABLES ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVariables([...value.variables, unused[0]!])}
          >
            + افزودن متغیر {`{${value.variables.length}}`}
          </Button>
        ) : null}
        {variablesErr ? (
          <p className="text-sm text-red-600">{variablesErr}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <Field
          label="متن پیامک (همان متن تأییدشده در ملی پیامک)"
          htmlFor={templateId}
          error={templateErr ?? liveError ?? undefined}
          required
        >
          <Textarea
            id={templateId}
            rows={4}
            value={value.template}
            onChange={(event) =>
              onChange({ ...value, template: event.target.value })
            }
            invalid={Boolean(templateErr ?? liveError)}
            maxLength={500}
          />
        </Field>
        <Field
          label="شناسه‌ی الگو (bodyId)"
          htmlFor={patternId}
          error={patternErr}
          hint={
            envPattern
              ? `خالی = از .env (${toPersianDigits(envPattern)})`
              : "کدی که ملی پیامک پس از تأیید الگو می‌دهد"
          }
        >
          <Input
            id={patternId}
            value={value.pattern}
            onChange={(event) =>
              onChange({ ...value, pattern: event.target.value })
            }
            invalid={Boolean(patternErr)}
            inputMode="numeric"
            dir="ltr"
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="rounded-lg bg-neutral-50 p-3 text-sm leading-7">
        <span className="text-xs text-neutral-500">
          پیش‌نمایش با مقادیر نمونه:
        </span>
        <p className="whitespace-pre-line">{preview}</p>
      </div>
    </section>
  );
}
