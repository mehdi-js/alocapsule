"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { MAX_OPTION_GROUPS } from "@/lib/product-options";

import type { OptionState } from "./product-form-state";
import type { OptionsAndRows } from "./product-options-state";
import {
  addOptionGroup,
  addOptionValue,
  removeOptionGroup,
  removeOptionValue,
  updateOptionGroup,
  updateOptionValue,
} from "./product-options-state";

/**
 * «گزینه‌ها» (SEO.md §۴.۴): گروه‌ها و مقدارها. مقدار ذخیره‌شده حذف نمی‌شود و
 * فقط غیرفعال می‌شود؛ پس از اولین سفارش، کد گروه/مقدار ذخیره‌شده قفل است.
 */
export function OptionsSection({
  options,
  variants,
  codesLocked,
  error,
  onChange,
}: {
  options: OptionState[];
  variants: OptionsAndRows["variants"];
  /** پس از اولین سفارش، کد گروه/مقدارِ ذخیره‌شده قابل تغییر نیست */
  codesLocked: boolean;
  error: (field: string) => string | undefined;
  onChange: (next: OptionsAndRows) => void;
}) {
  const state: OptionsAndRows = { options, variants };

  return (
    <div className="space-y-4">
      {options.length === 0 ? (
        <p className="text-sm text-neutral-600">
          محصول بدون گزینه یک قیمت دارد. برای نوع‌های مختلف (مثل «نوع شیر» یا
          «خالی/پرشده») یک گروه گزینه اضافه کنید؛ هر ترکیب قیمت مستقل دارد.
        </p>
      ) : null}
      {options.map((option, optionIndex) => {
        const locked = codesLocked && option.id !== undefined;
        return (
          <fieldset
            key={option.key}
            className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <legend className="sr-only">گروه گزینه {optionIndex + 1}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="نام گروه"
                htmlFor={`opt-${option.key}-name`}
                error={error(`options.${optionIndex}.name`)}
                hint="مثلاً «نوع شیر» یا «وضعیت تحویل»"
                required
              >
                <Input
                  id={`opt-${option.key}-name`}
                  value={option.name}
                  invalid={!!error(`options.${optionIndex}.name`)}
                  onChange={(event) =>
                    onChange(
                      updateOptionGroup(state, option.key, {
                        name: event.target.value,
                      }),
                    )
                  }
                />
              </Field>
              <Field
                label="کد گروه (لاتین)"
                htmlFor={`opt-${option.key}-code`}
                error={error(`options.${optionIndex}.code`)}
                hint={
                  locked
                    ? "پس از اولین سفارش قفل است."
                    : "مثل valve یا fill؛ در پارامتر آدرس استفاده می‌شود."
                }
                required
              >
                <Input
                  id={`opt-${option.key}-code`}
                  dir="ltr"
                  value={option.code}
                  disabled={locked}
                  invalid={!!error(`options.${optionIndex}.code`)}
                  onChange={(event) =>
                    onChange(
                      updateOptionGroup(state, option.key, {
                        code: event.target.value.toLowerCase(),
                      }),
                    )
                  }
                />
              </Field>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">مقدارها</p>
              {option.values.map((value, valueIndex) => {
                const path = `options.${optionIndex}.values.${valueIndex}`;
                const valueLocked = codesLocked && value.id !== undefined;
                return (
                  <div
                    key={value.key}
                    className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                  >
                    <Field
                      label="برچسب"
                      htmlFor={`opt-${value.key}-label`}
                      error={error(`${path}.label`)}
                      required
                    >
                      <Input
                        id={`opt-${value.key}-label`}
                        value={value.label}
                        invalid={!!error(`${path}.label`)}
                        onChange={(event) =>
                          onChange(
                            updateOptionValue(state, option.key, value.key, {
                              label: event.target.value,
                            }),
                          )
                        }
                      />
                    </Field>
                    <Field
                      label="کد (لاتین)"
                      htmlFor={`opt-${value.key}-code`}
                      error={error(`${path}.code`)}
                      required
                    >
                      <Input
                        id={`opt-${value.key}-code`}
                        dir="ltr"
                        value={value.code}
                        disabled={valueLocked}
                        invalid={!!error(`${path}.code`)}
                        onChange={(event) =>
                          onChange(
                            updateOptionValue(state, option.key, value.key, {
                              code: event.target.value.toLowerCase(),
                            }),
                          )
                        }
                      />
                    </Field>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      فعال
                      <Switch
                        checked={value.isActive}
                        label={`فعال بودن مقدار ${value.label || valueIndex + 1}`}
                        onChange={(isActive) =>
                          onChange(
                            updateOptionValue(state, option.key, value.key, {
                              isActive,
                            }),
                          )
                        }
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-1 text-red-600"
                      onClick={() =>
                        onChange(
                          removeOptionValue(state, option.key, value.key),
                        )
                      }
                      disabled={option.values.length === 1 && !value.id}
                    >
                      {value.id ? "غیرفعال‌سازی" : "حذف"}
                    </Button>
                  </div>
                );
              })}
              {error(`options.${optionIndex}.values`) ? (
                <p role="alert" className="text-xs text-red-600">
                  {error(`options.${optionIndex}.values`)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onChange(addOptionValue(state, option.key))}
                >
                  افزودن مقدار
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  disabled={locked}
                  title={
                    locked ? "پس از اولین سفارش حذف گروه ممکن نیست" : undefined
                  }
                  onClick={() => onChange(removeOptionGroup(state, option.key))}
                >
                  حذف گروه
                </Button>
              </div>
            </div>
          </fieldset>
        );
      })}
      {error("options") ? (
        <p role="alert" className="text-xs text-red-600">
          {error("options")}
        </p>
      ) : null}
      <Button
        variant="secondary"
        onClick={() => onChange(addOptionGroup(state))}
        disabled={options.length >= MAX_OPTION_GROUPS}
      >
        افزودن گروه گزینه
      </Button>
    </div>
  );
}
