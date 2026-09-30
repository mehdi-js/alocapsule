"use client";

import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import type { ProductUnit } from "@/lib/unit";
import type { CategoryDto } from "@/server/services/category.service";

import type { ProductFormState } from "./product-form-state";
import { RichTextField } from "./seo/RichTextField";
import { SlugField } from "./seo/SlugField";

/** بخش «اطلاعات اصلی» فرم محصول */
export function ProductBasicsSection({
  state,
  categories,
  originalSlug,
  unitLocked,
  error,
  onName,
  onUnit,
  onChange,
}: {
  state: ProductFormState;
  categories: CategoryDto[];
  /** نامک ذخیره‌شده (ویرایش) برای هشدار تغییر آدرس */
  originalSlug: string | null;
  unitLocked: boolean;
  error: (field: string) => string | undefined;
  onName: (name: string) => void;
  onUnit: (unit: ProductUnit) => void;
  onChange: (update: Partial<ProductFormState>) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-bold">اطلاعات اصلی</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="نام محصول (H1)"
          htmlFor="name"
          error={error("name")}
          required
        >
          <Input
            id="name"
            value={state.name}
            invalid={!!error("name")}
            onChange={(event) => onName(event.target.value)}
          />
        </Field>
        <SlugField
          value={state.slug}
          originalSlug={originalSlug}
          pathPrefix="/products/"
          example="example-product"
          error={error("slug")}
          onChange={(slug) => onChange({ slug, slugTouched: true })}
        />
        <Field
          label="دسته‌بندی"
          htmlFor="categoryId"
          error={error("categoryId")}
          required
        >
          <Select
            id="categoryId"
            value={state.categoryId}
            invalid={!!error("categoryId")}
            onChange={(event) => onChange({ categoryId: event.target.value })}
          >
            <option value="">انتخاب کنید…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {"— ".repeat(category.depth)}
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="واحد فروش"
          htmlFor="unit"
          error={error("unit")}
          hint={
            unitLocked
              ? "پس از ثبت اولین سفارش، واحد فروش قابل تغییر نیست."
              : "گرمی: وزنی (۵۰۰ گرم، ۱ کیلوگرم) — عددی: تعدادی (۶ عددی، ۱۲ عددی)"
          }
          required
        >
          <Select
            id="unit"
            value={state.unit}
            disabled={unitLocked}
            onChange={(event) => onUnit(event.target.value as ProductUnit)}
          >
            <option value="GRAM">گرمی (وزنی)</option>
            <option value="PIECE">عددی (تعدادی)</option>
          </Select>
        </Field>
        <Field
          label="ترتیب نمایش"
          htmlFor="sortOrder"
          error={error("sortOrder")}
          hint="عدد کمتر، بالاتر نمایش داده می‌شود."
        >
          <Input
            id="sortOrder"
            dir="ltr"
            inputMode="numeric"
            value={state.sortOrder}
            invalid={!!error("sortOrder")}
            onChange={(event) => onChange({ sortOrder: event.target.value })}
          />
        </Field>
      </div>
      <Field
        label="توضیح کوتاه"
        htmlFor="shortDescription"
        error={error("shortDescription")}
      >
        <Input
          id="shortDescription"
          value={state.shortDescription}
          invalid={!!error("shortDescription")}
          onChange={(event) =>
            onChange({ shortDescription: event.target.value })
          }
        />
      </Field>
      <RichTextField
        id="description"
        label="توضیحات"
        rows={10}
        headingLevel={3}
        value={state.description}
        error={error("description")}
        hint="حداقل ۲۵۰ کلمه و یک لینک داخلی برای سئو پیشنهاد می‌شود. تگ HTML ذخیره نمی‌شود."
        onChange={(description) => onChange({ description })}
      />
    </section>
  );
}
