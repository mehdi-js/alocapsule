"use client";

import type { PricingMode, ProductKind } from "@prisma/client";

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
  onChange,
}: {
  state: ProductFormState;
  categories: CategoryDto[];
  /** نامک ذخیره‌شده (ویرایش) برای هشدار تغییر آدرس */
  originalSlug: string | null;
  unitLocked: boolean;
  error: (field: string) => string | undefined;
  onName: (name: string) => void;
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
          label="واحد فروش (اختیاری)"
          htmlFor="unit"
          error={error("unit")}
          hint={
            unitLocked
              ? "پس از ثبت اولین سفارش، واحد فروش قابل تغییر نیست."
              : "فقط برای محصول قدیمیِ وزنی/تعدادی؛ محصول دارای گزینه‌ها آن را خالی می‌گذارد."
          }
        >
          <Select
            id="unit"
            value={state.unit}
            disabled={unitLocked}
            onChange={(event) =>
              onChange({ unit: event.target.value as ProductUnit | "" })
            }
          >
            <option value="">بدون واحد (گزینه‌ها)</option>
            <option value="GRAM">گرمی (وزنی)</option>
            <option value="PIECE">عددی (تعدادی)</option>
          </Select>
        </Field>
        <Field
          label="نوع محصول"
          htmlFor="kind"
          error={error("kind")}
          hint="خدمت (مثل شارژ کپسول): شرایط تعویض در صفحه‌ی محصول و تسویه نمایش داده می‌شود و مشتری باید بپذیرد."
        >
          <Select
            id="kind"
            value={state.kind}
            onChange={(event) =>
              onChange({ kind: event.target.value as ProductKind })
            }
          >
            <option value="PHYSICAL">کالای فیزیکی</option>
            <option value="SERVICE">خدمت</option>
          </Select>
        </Field>
        <Field
          label="حالت قیمت"
          htmlFor="pricingMode"
          error={error("pricingMode")}
          hint="استعلامی: قیمت ندارد، دکمه‌ی خرید ندارد و مشتری تماس می‌گیرد."
        >
          <Select
            id="pricingMode"
            value={state.pricingMode}
            onChange={(event) =>
              onChange({ pricingMode: event.target.value as PricingMode })
            }
          >
            <option value="FIXED">قیمت‌دار</option>
            <option value="INQUIRY">استعلامی</option>
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
