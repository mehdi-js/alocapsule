"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { formatToman } from "@/lib/money";
import type { ProductUnit } from "@/lib/unit";
import { calculatePricePerKg, getVariantTitle } from "@/lib/unit";
import { parseIntegerInput, toPersianDigits } from "@/lib/utils";
import { setVariantActiveAction } from "@/server/actions/product";

import { ActiveSwitch } from "./ActiveSwitch";
import type { VariantRowState } from "./product-form-state";

const numericProps = { inputMode: "numeric", dir: "ltr" } as const;

function previewTitle(unit: ProductUnit, row: VariantRowState): string | null {
  const unitValue = parseIntegerInput(row.unitValue);
  return unitValue && unitValue > 0 ? getVariantTitle(unit, unitValue) : null;
}

function previewPricePerKg(
  unit: ProductUnit,
  row: VariantRowState,
): string | null {
  const unitValue = parseIntegerInput(row.unitValue);
  const price = parseIntegerInput(row.price);
  if (!unitValue || unitValue <= 0 || price === null) return null;
  const perKg = calculatePricePerKg(unit, price, unitValue);
  return perKg === null ? null : `${formatToman(perKg)} تومان`;
}

export function VariantRows({
  unit,
  rows,
  errors,
  onChange,
  onAdd,
  onRemove,
}: {
  unit: ProductUnit;
  rows: VariantRowState[];
  errors: Record<string, string>;
  onChange: (index: number, patch: Partial<VariantRowState>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const isGram = unit === "GRAM";

  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const error = (field: string) => errors[`variants.${index}.${field}`];
        const id = (field: string) => `variant-${row.key}-${field}`;
        const title = previewTitle(unit, row);
        const perKg = isGram ? previewPricePerKg(unit, row) : null;

        return (
          <fieldset
            key={row.key}
            className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <legend className="sr-only">
              متغیر {toPersianDigits(index + 1)}
            </legend>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">
                متغیر {toPersianDigits(index + 1)}
                {title ? (
                  <span className="text-neutral-500"> — {title}</span>
                ) : null}
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  فعال در سایت
                  {row.id ? (
                    <ActiveSwitch
                      initialChecked={row.isActive}
                      label={`فعال بودن متغیر ${index + 1} در سایت`}
                      activeMessage="متغیر در سایت نمایش داده می‌شود."
                      inactiveMessage="متغیر از سایت برداشته شد."
                      onToggle={setVariantActiveAction.bind(null, row.id)}
                    />
                  ) : (
                    <Switch
                      checked={row.isActive}
                      onChange={(next) => onChange(index, { isActive: next })}
                      label={`فعال بودن متغیر ${index + 1} در سایت`}
                    />
                  )}
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => onRemove(index)}
                  disabled={rows.length === 1}
                  title={
                    rows.length === 1 ? "حداقل یک متغیر لازم است" : undefined
                  }
                >
                  حذف
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label={isGram ? "وزن (گرم)" : "تعداد در هر بسته"}
                htmlFor={id("unitValue")}
                error={error("unitValue")}
                hint={isGram ? "مثلاً ۵۰۰ یا ۱۰۰۰" : "مثلاً ۶ یا ۱۲"}
                required
              >
                <Input
                  id={id("unitValue")}
                  value={row.unitValue}
                  invalid={!!error("unitValue")}
                  onChange={(event) => {
                    const unitValue = event.target.value;
                    onChange(index, { unitValue });
                  }}
                  {...numericProps}
                />
              </Field>

              <Field
                label="قیمت (تومان)"
                htmlFor={id("price")}
                error={error("price")}
                hint={perKg ? `قیمت هر کیلو: ${perKg}` : undefined}
                required
              >
                <Input
                  id={id("price")}
                  value={row.price}
                  invalid={!!error("price")}
                  onChange={(event) =>
                    onChange(index, { price: event.target.value })
                  }
                  {...numericProps}
                />
              </Field>

              <Field
                label="قیمت قبل از تخفیف (اختیاری)"
                htmlFor={id("comparePrice")}
                error={error("comparePrice")}
              >
                <Input
                  id={id("comparePrice")}
                  value={row.comparePrice}
                  invalid={!!error("comparePrice")}
                  onChange={(event) =>
                    onChange(index, { comparePrice: event.target.value })
                  }
                  {...numericProps}
                />
              </Field>

              <Field
                label="وزن ارسال هر بسته (گرم)"
                htmlFor={id("shippingWeightGrams")}
                error={error("shippingWeightGrams")}
                hint="با وزن جعبه و بسته‌بندی؛ در سبد در تعداد ضرب می‌شود."
                required
              >
                <Input
                  id={id("shippingWeightGrams")}
                  value={row.shippingWeightGrams}
                  invalid={!!error("shippingWeightGrams")}
                  onChange={(event) =>
                    onChange(index, {
                      shippingWeightGrams: event.target.value,
                      weightTouched: true,
                    })
                  }
                  {...numericProps}
                />
              </Field>

              <Field
                label="عنوان دلخواه (اختیاری)"
                htmlFor={id("title")}
                error={error("title")}
                hint={
                  title
                    ? `اگر خالی بماند: «${title}»`
                    : "اگر خالی بماند، خودکار ساخته می‌شود."
                }
              >
                <Input
                  id={id("title")}
                  value={row.title}
                  invalid={!!error("title")}
                  onChange={(event) =>
                    onChange(index, { title: event.target.value })
                  }
                />
              </Field>

              <Field
                label="کد کالا / SKU (اختیاری)"
                htmlFor={id("sku")}
                error={error("sku")}
              >
                <Input
                  id={id("sku")}
                  value={row.sku}
                  invalid={!!error("sku")}
                  dir="ltr"
                  onChange={(event) =>
                    onChange(index, { sku: event.target.value })
                  }
                />
              </Field>
            </div>
          </fieldset>
        );
      })}

      <Button variant="secondary" onClick={onAdd}>
        + افزودن متغیر
      </Button>
      {errors.variants ? (
        <p role="alert" className="text-sm text-red-600">
          {errors.variants}
        </p>
      ) : null}
    </div>
  );
}
