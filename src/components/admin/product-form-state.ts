import type { PricingMode, ProductKind } from "@prisma/client";

import {
  emptySeoForm,
  seoFormFrom,
  type SeoFormState,
  toSeoInput,
} from "@/components/admin/seo/seo-form-state";
import {
  buildOptionKey,
  buildVariantTitle,
  isLegacyKey,
  missingCombinations,
  type OptionDef,
  type Selection,
} from "@/lib/product-options";
import { slugify } from "@/lib/slug";
import type { ProductUnit } from "@/lib/unit";
import { parseIntegerInput } from "@/lib/utils";
import type { ProductFormInput } from "@/lib/validation/product";
import type { ProductEditDto } from "@/server/services/product-query.service";

let rowCounter = 0;
export function newRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

/** مقدار یک گروه گزینه (مثل «پرسی»)؛ مقدار ذخیره‌شده حذف نمی‌شود، غیرفعال می‌شود */
export interface OptionValueState {
  key: string;
  /** فقط برای مقدار ذخیره‌شده */
  id?: string;
  label: string;
  code: string;
  isActive: boolean;
}

export interface OptionState {
  key: string;
  id?: string;
  name: string;
  code: string;
  values: OptionValueState[];
}

/** یک ترکیب (variant) با قیمت مستقل؛ مقدارها رشته‌اند تا ورودی نیمه‌کاره مشکلی نسازد */
export interface VariantRowState {
  /** کلید پایدار React (متفاوت از id دیتابیس) */
  key: string;
  /** فقط برای ترکیب ذخیره‌شده */
  id?: string;
  /** کلید ذخیره‌شده (برای ترکیب قدیمی `legacy:*` که گزینه ندارد) */
  optionKey?: string;
  /** عنوان دلخواه/قدیمی؛ برای محصول دارای گزینه خالی و خودکار */
  title: string;
  /** کد گروه ⇒ کد مقدار */
  selection: Selection;
  sku: string;
  price: string;
  comparePrice: string;
  shippingWeightGrams: string;
  isActive: boolean;
}

export interface ProductFormState {
  name: string;
  slug: string;
  /** تا وقتی ادمین slug را دستی نزده، از روی نام ساخته می‌شود */
  slugTouched: boolean;
  categoryId: string;
  /** اختیاری (فقط محصول قدیمی وزنی/تعدادی) */
  unit: ProductUnit | "";
  kind: ProductKind;
  pricingMode: PricingMode;
  serviceTerms: string;
  pairedProductId: string;
  shortDescription: string;
  description: string;
  seo: SeoFormState;
  canonicalUrl: string;
  sortOrder: string;
  isActive: boolean;
  options: OptionState[];
  variants: VariantRowState[];
}

export function emptyVariantRow(selection: Selection = {}): VariantRowState {
  return {
    key: newRowKey(),
    title: "",
    selection,
    sku: "",
    price: "",
    comparePrice: "",
    shippingWeightGrams: "",
    isActive: true,
  };
}

export function emptyOptionValue(): OptionValueState {
  return { key: newRowKey(), label: "", code: "", isActive: true };
}

export function emptyOption(): OptionState {
  return {
    key: newRowKey(),
    name: "",
    code: "",
    values: [emptyOptionValue()],
  };
}

export function emptyProductForm(): ProductFormState {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    categoryId: "",
    unit: "",
    kind: "PHYSICAL",
    pricingMode: "FIXED",
    serviceTerms: "",
    pairedProductId: "",
    shortDescription: "",
    description: "",
    seo: emptySeoForm(),
    canonicalUrl: "",
    sortOrder: "0",
    isActive: true,
    options: [],
    variants: [emptyVariantRow()],
  };
}

export function formFromDto(dto: ProductEditDto): ProductFormState {
  return {
    name: dto.name,
    slug: dto.slug,
    slugTouched: true,
    categoryId: dto.categoryId,
    unit: dto.unit ?? "",
    kind: dto.kind,
    pricingMode: dto.pricingMode,
    serviceTerms: dto.serviceTerms ?? "",
    pairedProductId: dto.paired?.id ?? "",
    shortDescription: dto.shortDescription ?? "",
    description: dto.description ?? "",
    seo: seoFormFrom(dto),
    canonicalUrl: dto.canonicalUrl ?? "",
    sortOrder: String(dto.sortOrder),
    isActive: dto.isActive,
    options: dto.options.map((option) => ({
      key: newRowKey(),
      id: option.id,
      name: option.name,
      code: option.code,
      values: option.values.map((value) => ({
        key: newRowKey(),
        id: value.id,
        label: value.label,
        code: value.code,
        isActive: value.isActive,
      })),
    })),
    variants: dto.variants.map((variant) => ({
      key: newRowKey(),
      id: variant.id,
      optionKey: variant.optionKey,
      title: variant.title ?? "",
      selection: variant.selection,
      sku: variant.sku ?? "",
      price: variant.price > 0 ? String(variant.price) : "",
      comparePrice:
        variant.comparePrice === null ? "" : String(variant.comparePrice),
      shippingWeightGrams:
        variant.shippingWeightGrams > 0
          ? String(variant.shippingWeightGrams)
          : "",
      isActive: variant.isActive,
    })),
  };
}

/** تعریف گروه‌ها برای توابع خالص (بدون گروه/مقدارِ ناقص) */
export function optionDefs(options: OptionState[]): OptionDef[] {
  return options
    .filter((option) => option.code.trim() !== "")
    .map((option) => ({
      code: option.code.trim(),
      name: option.name,
      values: option.values
        .filter((value) => value.code.trim() !== "")
        .map((value) => ({
          code: value.code.trim(),
          label: value.label,
          isActive: value.isActive,
        })),
    }));
}

/** عنوان نمایشی ردیف: برچسب‌های گزینه، عنوان قدیمی یا «پیش‌فرض» */
export function rowLabel(options: OptionState[], row: VariantRowState): string {
  const fromOptions = buildVariantTitle(optionDefs(options), row.selection);
  if (fromOptions) return fromOptions;
  if (row.title.trim()) return row.title.trim();
  return options.length === 0 ? "قیمت محصول" : "ترکیب ناقص";
}

/** «ساخت همه‌ی ترکیب‌ها»: فقط ترکیب‌های جدید، غیرفعال و بدون قیمت؛ موجودها دست‌نخورده */
export function withAllCombinations(
  options: OptionState[],
  rows: VariantRowState[],
): VariantRowState[] {
  const existing = rows.map((row) => buildOptionKey(row.selection));
  const fresh = missingCombinations(optionDefs(options), existing);
  return [
    ...rows,
    ...fresh.map((selection) => ({
      ...emptyVariantRow(selection),
      isActive: false,
    })),
  ];
}

/**
 * ورودی سرور از روی state فرم. مقدار نامعتبر `undefined` می‌شود تا Zod پیام
 * فارسی همان فیلد را برگرداند. در حالت ویرایش `isActive` ترکیب موجود فرستاده
 * نمی‌شود (کلید فوری آن را عوض می‌کند).
 */
export function toProductInput(
  state: ProductFormState,
  mode: "create" | "edit",
): ProductFormInput {
  const number = (value: string) => parseIntegerInput(value) ?? undefined;
  const inquiry = state.pricingMode === "INQUIRY";
  return {
    name: state.name,
    slug: state.slug,
    categoryId: state.categoryId,
    unit: state.unit || null,
    kind: state.kind,
    pricingMode: state.pricingMode,
    serviceTerms: state.serviceTerms,
    pairedProductId: state.pairedProductId || null,
    shortDescription: state.shortDescription,
    description: state.description,
    ...toSeoInput(state.seo),
    canonicalUrl: state.canonicalUrl,
    // NaN (نه undefined) تا مقدار نامعتبر بی‌صدا به پیش‌فرض ۰ تبدیل نشود
    sortOrder: parseIntegerInput(state.sortOrder) ?? Number.NaN,
    ...(mode === "create" ? { isActive: state.isActive } : {}),
    // استعلامی گزینه و ترکیب ندارد (سرور هم نادیده می‌گیرد)
    options: inquiry
      ? []
      : state.options.map((option) => ({
          ...(option.id ? { id: option.id } : {}),
          name: option.name,
          code: option.code,
          values: option.values.map((value) => ({
            ...(value.id ? { id: value.id } : {}),
            label: value.label,
            code: value.code,
            isActive: value.isActive,
          })),
        })),
    variants: inquiry
      ? []
      : state.variants.map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          selection: row.selection,
          // عنوان فقط برای ترکیب قدیمی؛ در محصول دارای گزینه خودکار است
          title:
            state.options.length === 0 ||
            (row.optionKey && isLegacyKey(row.optionKey))
              ? row.title
              : "",
          sku: row.sku,
          price: row.price.trim() === "" ? 0 : (number(row.price) as number),
          comparePrice:
            row.comparePrice.trim() === "" ? null : number(row.comparePrice),
          shippingWeightGrams:
            row.shippingWeightGrams.trim() === ""
              ? 0
              : (number(row.shippingWeightGrams) as number),
          ...(!row.id ? { isActive: row.isActive } : {}),
        })),
  };
}

/** نامک از نام فقط وقتی نام لاتین باشد؛ برای نام فارسی ادمین وارد می‌کند */
export function autoSlug(name: string): string {
  return slugify(name);
}
