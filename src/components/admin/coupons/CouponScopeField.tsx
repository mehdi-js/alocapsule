"use client";

import { useState } from "react";

import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { toPersianDigits } from "@/lib/utils";

type Scope = "ALL" | "CATEGORY" | "PRODUCT";

interface Option {
  id: string;
  name: string;
}

function CheckboxList({
  options,
  selected,
  onChange,
  searchable,
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchable: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = query
    ? options.filter((option) => option.name.includes(query.trim()))
    : options;

  return (
    <div className="space-y-2">
      {searchable ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجو…"
          aria-label="جستجو در فهرست"
        />
      ) : null}
      <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
        {visible.map((option) => (
          <li key={option.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option.id]
                      : selected.filter((id) => id !== option.id),
                  )
                }
              />
              {option.name}
            </label>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="px-2 py-1.5 text-sm text-neutral-500">
            موردی پیدا نشد.
          </li>
        ) : null}
      </ul>
      <p className="text-xs text-neutral-500">
        {toPersianDigits(selected.length)} مورد انتخاب شده
      </p>
    </div>
  );
}

/** دامنه‌ی کد: همه‌ی محصولات، دسته‌های خاص (با زیردسته‌ها) یا محصولات خاص */
export function CouponScopeField({
  scope,
  categoryIds,
  productIds,
  categories,
  products,
  errors,
  onChange,
}: {
  scope: Scope;
  categoryIds: string[];
  productIds: string[];
  categories: Option[];
  products: Option[];
  errors: Record<string, string>;
  onChange: (update: {
    scope?: Scope;
    categoryIds?: string[];
    productIds?: string[];
  }) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="دامنه‌ی تخفیف" htmlFor="coupon-scope">
        <Select
          id="coupon-scope"
          value={scope}
          onChange={(event) => onChange({ scope: event.target.value as Scope })}
        >
          <option value="ALL">همه‌ی محصولات</option>
          <option value="CATEGORY">دسته‌بندی‌های خاص (شامل زیردسته‌ها)</option>
          <option value="PRODUCT">محصولات خاص</option>
        </Select>
      </Field>

      {scope === "CATEGORY" ? (
        <Field
          label="دسته‌بندی‌های مشمول"
          htmlFor="coupon-categories"
          error={errors.categoryIds}
        >
          <div id="coupon-categories">
            <CheckboxList
              options={categories}
              selected={categoryIds}
              onChange={(ids) => onChange({ categoryIds: ids })}
              searchable={false}
            />
          </div>
        </Field>
      ) : null}

      {scope === "PRODUCT" ? (
        <Field
          label="محصولات مشمول"
          htmlFor="coupon-products"
          error={errors.productIds}
        >
          <div id="coupon-products">
            <CheckboxList
              options={products}
              selected={productIds}
              onChange={(ids) => onChange({ productIds: ids })}
              searchable
            />
          </div>
        </Field>
      ) : null}
    </div>
  );
}
