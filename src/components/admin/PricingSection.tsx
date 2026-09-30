"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { formatJalali } from "@/lib/date";
import {
  buildOptionKey,
  computeFilledPrices,
  missingCombinations,
} from "@/lib/product-options";
import { parseIntegerInput, toPersianDigits } from "@/lib/utils";
import { setVariantActiveAction } from "@/server/actions/product";

import { ActiveSwitch } from "./ActiveSwitch";
import {
  optionDefs,
  type OptionState,
  rowLabel,
  type VariantRowState,
  withAllCombinations,
} from "./product-form-state";

const numericProps = { inputMode: "numeric", dir: "ltr" } as const;

/**
 * «قیمت‌گذاری ترکیب‌ها» (SEO.md §۴.۴): یک ردیف برای هر ترکیب با قیمت، قیمت قبل
 * از تخفیف، وزن ارسال و فعال/غیرفعال. «ساخت همه‌ی ترکیب‌ها» ترکیب‌های جدید را
 * غیرفعال و بدون قیمت می‌سازد و ترکیب موجود را دست نمی‌زند؛ ترکیب بدون قیمت
 * فعال نمی‌شود. «محاسبه‌ی قیمت پرشده» فقط با محصول متناظر کار می‌کند.
 */
export function PricingSection({
  options,
  rows,
  errors,
  priceUpdatedAt,
  paired,
  pairedProductId,
  pairingOptions,
  onRows,
  onPairedChange,
}: {
  options: OptionState[];
  rows: VariantRowState[];
  errors: Record<string, string>;
  priceUpdatedAt: Date | null;
  /** محصول متناظرِ ذخیره‌شده همراه قیمت‌های فعالش */
  paired: { id: string; name: string; activePrices: number[] } | null;
  pairedProductId: string;
  pairingOptions: { id: string; name: string }[];
  onRows: (rows: VariantRowState[]) => void;
  onPairedChange: (id: string) => void;
}) {
  const toast = useToast();
  const hasOptions = options.length > 0;
  const defs = optionDefs(options);
  const missing = missingCombinations(
    defs,
    rows.map((row) => buildOptionKey(row.selection)),
  );
  const hasFill = options.some(
    (option) =>
      option.code === "fill" &&
      option.values.some((v) => v.code === "empty") &&
      option.values.some((v) => v.code === "filled"),
  );

  function patchRow(index: number, patch: Partial<VariantRowState>) {
    onRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function buildAll() {
    const next = withAllCombinations(options, rows);
    if (next.length === rows.length) {
      toast.success("همه‌ی ترکیب‌ها از قبل ساخته شده‌اند.");
      return;
    }
    onRows(next);
    toast.success(
      `${toPersianDigits(next.length - rows.length)} ترکیب جدید (غیرفعال و بدون قیمت) اضافه شد؛ قیمت‌ها را وارد و ذخیره کنید.`,
    );
  }

  function calculateFilled() {
    if (!paired || paired.id !== pairedProductId) {
      toast.error("ابتدا محصول متناظر را انتخاب و محصول را ذخیره کنید.");
      return;
    }
    const result = computeFilledPrices(
      rows.map((row) => ({
        selection: row.selection,
        price: parseIntegerInput(row.price),
      })),
      paired.activePrices,
    );
    if (result.kind === "warn") {
      toast.error(result.message);
      return;
    }
    const byKey = new Map(
      result.prices.map((item) => [buildOptionKey(item.selection), item.price]),
    );
    // فقط یک‌بار پر می‌کند؛ ادمین تأیید و ذخیره می‌کند (پیوند دائمی قیمت‌ها نیست)
    onRows(
      rows.map((row) => {
        const price = byKey.get(buildOptionKey(row.selection));
        return price === undefined ? row : { ...row, price: String(price) };
      }),
    );
    toast.success("قیمت پرشده پیشنهاد شد؛ بررسی و ذخیره کنید.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="محصول متناظر"
          htmlFor="pairedProductId"
          error={errors.pairedProductId}
          hint="شارژ N کیلویی ↔ خرید N کیلویی؛ رابطه دوطرفه است و در محصولات مرتبط و کمک‌قیمت‌گذاری استفاده می‌شود."
        >
          <Select
            id="pairedProductId"
            value={pairedProductId}
            onChange={(event) => onPairedChange(event.target.value)}
          >
            <option value="">بدون محصول متناظر</option>
            {pairingOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="self-end pb-2 text-sm text-neutral-500">
          {priceUpdatedAt
            ? `آخرین به‌روزرسانی قیمت: ${formatJalali(priceUpdatedAt, "YYYY/MM/DD")}`
            : "قیمتی ثبت نشده است."}
        </p>
      </div>

      {hasOptions || hasFill ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={buildAll}
            disabled={!hasOptions}
            title={
              missing.length === 0 && hasOptions
                ? "همه‌ی ترکیب‌ها ساخته شده‌اند"
                : undefined
            }
          >
            ساخت همه‌ی ترکیب‌ها
          </Button>
          {hasFill && paired ? (
            <Button variant="secondary" onClick={calculateFilled}>
              محاسبه‌ی قیمت پرشده
            </Button>
          ) : null}
        </div>
      ) : null}
      {errors.variants ? (
        <p role="alert" className="text-sm text-red-600">
          {errors.variants}
        </p>
      ) : null}

      {rows.map((row, index) => {
        const error = (field: string) => errors[`variants.${index}.${field}`];
        const id = (field: string) => `variant-${row.key}-${field}`;
        const label = rowLabel(options, row);
        const unsaved = !row.id;

        return (
          <fieldset
            key={row.key}
            className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <legend className="sr-only">
              ترکیب {toPersianDigits(index + 1)}
            </legend>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">
                {hasOptions ? label : "قیمت محصول"}
                {!hasOptions && row.title ? (
                  <span className="text-neutral-500"> — {row.title}</span>
                ) : null}
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  فعال در سایت
                  {row.id ? (
                    <ActiveSwitch
                      initialChecked={row.isActive}
                      label={`فعال بودن ${label} در سایت`}
                      activeMessage="ترکیب در سایت نمایش داده می‌شود."
                      inactiveMessage="ترکیب از سایت برداشته شد."
                      onToggle={setVariantActiveAction.bind(null, row.id)}
                    />
                  ) : (
                    <Switch
                      checked={row.isActive}
                      onChange={(next) => patchRow(index, { isActive: next })}
                      label={`فعال بودن ${label} در سایت`}
                    />
                  )}
                </label>
                {unsaved && (hasOptions || rows.length > 1) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => onRows(rows.filter((_, i) => i !== index))}
                  >
                    حذف
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="قیمت (تومان)"
                htmlFor={id("price")}
                error={error("price")}
                hint="خالی ⇒ بدون قیمت (غیرفعال می‌ماند)"
              >
                <Input
                  id={id("price")}
                  value={row.price}
                  invalid={!!error("price")}
                  onChange={(event) =>
                    patchRow(index, { price: event.target.value })
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
                    patchRow(index, { comparePrice: event.target.value })
                  }
                  {...numericProps}
                />
              </Field>
              <Field
                label="وزن ارسال (گرم)"
                htmlFor={id("shippingWeightGrams")}
                error={error("shippingWeightGrams")}
                hint="با وزن کپسول و بسته‌بندی؛ در سبد در تعداد ضرب می‌شود."
              >
                <Input
                  id={id("shippingWeightGrams")}
                  value={row.shippingWeightGrams}
                  invalid={!!error("shippingWeightGrams")}
                  onChange={(event) =>
                    patchRow(index, { shippingWeightGrams: event.target.value })
                  }
                  {...numericProps}
                />
              </Field>
              <Field
                label="کد کالا (SKU) (اختیاری)"
                htmlFor={id("sku")}
                error={error("sku")}
              >
                <Input
                  id={id("sku")}
                  dir="ltr"
                  value={row.sku}
                  invalid={!!error("sku")}
                  onChange={(event) =>
                    patchRow(index, { sku: event.target.value })
                  }
                />
              </Field>
            </div>
            {error("selection") ? (
              <p role="alert" className="text-xs text-red-600">
                {error("selection")}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
