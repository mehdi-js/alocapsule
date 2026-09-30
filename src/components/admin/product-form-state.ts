import {
  emptySeoForm,
  seoFormFrom,
  type SeoFormState,
  toSeoInput,
} from "@/components/admin/seo/seo-form-state";
import { slugify } from "@/lib/slug";
import type { ProductUnit } from "@/lib/unit";
import { suggestShippingWeightGrams } from "@/lib/unit";
import { parseIntegerInput } from "@/lib/utils";
import type { ProductFormInput } from "@/lib/validation/product";
import type { ProductEditDto } from "@/server/services/product-query.service";

/** مقدارهای فرم رشته‌اند تا ورودی نیمه‌کاره (خالی، ارقام فارسی) مشکلی نسازد. */
export interface VariantRowState {
  /** کلید پایدار React (متفاوت از id دیتابیس) */
  key: string;
  /** فقط برای متغیر ذخیره‌شده */
  id?: string;
  unitValue: string;
  title: string;
  sku: string;
  price: string;
  comparePrice: string;
  shippingWeightGrams: string;
  /** اگر ادمین وزن را دستی زده، پیشنهاد خودکار دیگر جایگزینش نمی‌شود */
  weightTouched: boolean;
  isActive: boolean;
}

export interface ProductFormState {
  name: string;
  slug: string;
  /** تا وقتی ادمین slug را دستی نزده، از روی نام ساخته می‌شود */
  slugTouched: boolean;
  categoryId: string;
  unit: ProductUnit;
  shortDescription: string;
  description: string;
  seo: SeoFormState;
  canonicalUrl: string;
  sortOrder: string;
  isActive: boolean;
  variants: VariantRowState[];
}

let rowCounter = 0;
export function newRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function emptyVariantRow(): VariantRowState {
  return {
    key: newRowKey(),
    unitValue: "",
    title: "",
    sku: "",
    price: "",
    comparePrice: "",
    shippingWeightGrams: "",
    weightTouched: false,
    isActive: true,
  };
}

export function emptyProductForm(): ProductFormState {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    categoryId: "",
    unit: "GRAM",
    shortDescription: "",
    description: "",
    seo: emptySeoForm(),
    canonicalUrl: "",
    sortOrder: "0",
    isActive: true,
    variants: [emptyVariantRow()],
  };
}

export function formFromDto(dto: ProductEditDto): ProductFormState {
  return {
    name: dto.name,
    slug: dto.slug,
    slugTouched: true,
    categoryId: dto.categoryId,
    unit: dto.unit,
    shortDescription: dto.shortDescription ?? "",
    description: dto.description ?? "",
    seo: seoFormFrom(dto),
    canonicalUrl: dto.canonicalUrl ?? "",
    sortOrder: String(dto.sortOrder),
    isActive: dto.isActive,
    variants: dto.variants.map((variant) => ({
      key: newRowKey(),
      id: variant.id,
      unitValue: String(variant.unitValue),
      title: variant.title ?? "",
      sku: variant.sku ?? "",
      price: String(variant.price),
      comparePrice:
        variant.comparePrice === null ? "" : String(variant.comparePrice),
      shippingWeightGrams: String(variant.shippingWeightGrams),
      weightTouched: true,
      isActive: variant.isActive,
    })),
  };
}

/** وزن ارسال پیشنهادی برای ردیفی که ادمین وزنش را دستی تنظیم نکرده */
export function withSuggestedWeight(
  row: VariantRowState,
  unit: ProductUnit,
): VariantRowState {
  if (row.weightTouched) return row;
  const unitValue = parseIntegerInput(row.unitValue);
  const suggestion =
    unitValue && unitValue > 0
      ? suggestShippingWeightGrams(unit, unitValue)
      : null;
  return {
    ...row,
    shippingWeightGrams: suggestion === null ? "" : String(suggestion),
  };
}

/** نامک از نام فقط وقتی نام لاتین باشد؛ برای نام فارسی ادمین وارد می‌کند */
export function autoSlug(name: string): string {
  return slugify(name);
}

/**
 * ورودی سرور از روی state فرم. مقدار نامعتبر `undefined` می‌شود تا Zod پیام
 * فارسی همان فیلد را برگرداند. در حالت ویرایش `isActive` فرستاده نمی‌شود
 * (کلید فوری آن را عوض می‌کند).
 */
export function toProductInput(
  state: ProductFormState,
  mode: "create" | "edit",
): ProductFormInput {
  const number = (value: string) => parseIntegerInput(value) ?? undefined;
  return {
    name: state.name,
    slug: state.slug,
    categoryId: state.categoryId,
    unit: state.unit,
    shortDescription: state.shortDescription,
    description: state.description,
    ...toSeoInput(state.seo),
    canonicalUrl: state.canonicalUrl,
    // NaN (نه undefined) تا مقدار نامعتبر بی‌صدا به پیش‌فرض ۰ تبدیل نشود
    sortOrder: parseIntegerInput(state.sortOrder) ?? Number.NaN,
    ...(mode === "create" ? { isActive: state.isActive } : {}),
    variants: state.variants.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      unitValue: number(row.unitValue) as number,
      title: row.title,
      sku: row.sku,
      price: number(row.price) as number,
      comparePrice:
        row.comparePrice.trim() === "" ? null : number(row.comparePrice),
      shippingWeightGrams: number(row.shippingWeightGrams) as number,
      ...(!row.id ? { isActive: row.isActive } : {}),
    })),
  };
}
