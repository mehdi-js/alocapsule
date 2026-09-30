import { z } from "zod";

import {
  MAX_OPTION_GROUPS,
  MAX_OPTION_VALUES,
  OPTION_CODE_PATTERN,
  validateOptionDefinitions,
} from "@/lib/product-options";

import { canonicalUrlSchema, latinSlugSchema, seoFieldsSchema } from "./seo";

/** سقف Int در Postgres */
export const MAX_INT = 2_147_483_647;
export const MAX_VARIANTS = 30;
export const MAX_SERVICE_TERMS_LENGTH = 5000;

export const PRODUCT_KINDS = ["PHYSICAL", "SERVICE"] as const;
export const PRICING_MODES = ["FIXED", "INQUIRY"] as const;

export const NO_PRICE_ACTIVE_MESSAGE = "ترکیب بدون قیمت نمی‌تواند فعال شود";

export const FIXED_NEEDS_VARIANT_MESSAGE =
  "محصول قیمت‌دار حداقل یک ترکیب (با قیمت) لازم دارد";

function intField(label: string, min: number, max: number) {
  return z
    .number({ error: `${label} باید عدد صحیح باشد` })
    .int(`${label} باید عدد صحیح باشد`)
    .min(min, `${label} باید حداقل ${min} باشد`)
    .max(max, `${label} نباید بیشتر از ${max} باشد`);
}

function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} حداکثر ${max} کاراکتر باشد`)
    .nullish()
    .transform((value) => value || null);
}

const optionCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "کد را وارد کنید")
  .max(20, "کد حداکثر ۲۰ کاراکتر باشد")
  .regex(OPTION_CODE_PATTERN, "کد فقط حروف کوچک انگلیسی، عدد و خط تیره باشد");

export const optionValueInputSchema = z.object({
  /** خالی ⇒ مقدار جدید */
  id: z.string().min(1).optional(),
  label: z
    .string()
    .trim()
    .min(1, "برچسب مقدار را وارد کنید")
    .max(40, "برچسب حداکثر ۴۰ کاراکتر باشد"),
  code: optionCodeSchema,
  /** مقدار غیرفعال در ساخت ترکیب‌های جدید نمی‌آید و ترکیب‌هایش غیرفعال می‌شوند */
  isActive: z.boolean().default(true),
});

export const optionInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z
    .string()
    .trim()
    .min(2, "نام گروه حداقل ۲ کاراکتر باشد")
    .max(40, "نام گروه حداکثر ۴۰ کاراکتر باشد"),
  code: optionCodeSchema,
  values: z
    .array(optionValueInputSchema)
    .min(1, "هر گروه حداقل یک مقدار لازم دارد")
    .max(MAX_OPTION_VALUES, `حداکثر ${MAX_OPTION_VALUES} مقدار مجاز است`),
});

/** ترکیب = یک variant با قیمت مستقل؛ `price = 0` یعنی «بدون قیمت» (فقط غیرفعال) */
export const variantInputSchema = z.object({
  /** خالی ⇒ ترکیب جدید */
  id: z.string().min(1).optional(),
  /** کد گروه ⇒ کد مقدار (برای محصول بدون گزینه خالی) */
  selection: z.record(z.string(), z.string()).default({}),
  /** خالی ⇒ عنوان خودکار از برچسب‌ها */
  title: optionalText("عنوان", 60),
  sku: optionalText("کد کالا (SKU)", 40),
  price: intField("قیمت", 0, MAX_INT),
  comparePrice: intField("قیمت قبل از تخفیف", 1, MAX_INT)
    .nullish()
    .transform((value) => value ?? null),
  shippingWeightGrams: intField("وزن ارسال", 0, 10_000_000),
  /** فقط برای ترکیب جدید؛ وضعیت ترکیب موجود با کلید فوری عوض می‌شود. */
  isActive: z.boolean().optional(),
});

export const productInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "نام محصول حداقل ۲ کاراکتر باشد")
      .max(120, "نام محصول حداکثر ۱۲۰ کاراکتر باشد"),
    slug: latinSlugSchema,
    categoryId: z.string().min(1, "دسته‌بندی را انتخاب کنید"),
    /** اختیاری: فقط برای محصول قدیمی وزنی/تعدادی؛ محصول دارای گزینه‌ها ندارد */
    unit: z
      .enum(["GRAM", "PIECE"], { error: "واحد فروش را انتخاب کنید" })
      .nullish()
      .transform((value) => value ?? null),
    kind: z
      .enum(PRODUCT_KINDS, { error: "نوع محصول را انتخاب کنید" })
      .default("PHYSICAL"),
    pricingMode: z
      .enum(PRICING_MODES, { error: "حالت قیمت را انتخاب کنید" })
      .default("FIXED"),
    /** فقط برای خدمت؛ برای کالای فیزیکی نادیده گرفته می‌شود. خالی ⇒ متن پیش‌فرض تنظیمات */
    serviceTerms: optionalText("شرایط خدمت", MAX_SERVICE_TERMS_LENGTH),
    shortDescription: optionalText("توضیح کوتاه", 300),
    description: optionalText("توضیحات", 10_000),
    ...seoFieldsSchema,
    canonicalUrl: canonicalUrlSchema,
    sortOrder: intField("ترتیب نمایش", 0, 9999).default(0),
    /** فقط هنگام ساخت؛ در ویرایش با کلید فوری عوض می‌شود. */
    isActive: z.boolean().optional(),
    /** محصول متناظر (شارژ N ↔ خرید N)؛ خالی ⇒ بدون جفت. رابطه دوطرفه ذخیره می‌شود */
    pairedProductId: z
      .string()
      .nullish()
      .transform((value) => value || null),
    /** گروه‌های گزینه (حداکثر ۳)؛ استعلامی ⇒ نادیده گرفته می‌شود */
    options: z
      .array(optionInputSchema)
      .max(MAX_OPTION_GROUPS, `حداکثر ${MAX_OPTION_GROUPS} گروه گزینه مجاز است`)
      .default([]),
    /**
     * ترکیب‌ها. قیمت‌دار ⇒ حداقل یکی. استعلامی ⇒ بدون ترکیب و ورودی نادیده
     * گرفته می‌شود (ترکیب‌های موجود غیرفعال می‌شوند، حذف نمی‌شوند).
     */
    variants: z
      .array(variantInputSchema)
      .max(MAX_VARIANTS, `حداکثر ${MAX_VARIANTS} ترکیب مجاز است`)
      .default([]),
  })
  .superRefine((product, ctx) => {
    if (product.pricingMode === "INQUIRY") return;
    if (product.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: FIXED_NEEDS_VARIANT_MESSAGE,
      });
    }
    for (const issue of validateOptionDefinitions(product.options)) {
      ctx.addIssue({
        code: "custom",
        path: issue.path
          .split(".")
          .map((part) => (/^\d+$/.test(part) ? Number(part) : part)),
        message: issue.message,
      });
    }
    product.variants.forEach((variant, index) => {
      if (
        variant.comparePrice !== null &&
        variant.comparePrice <= variant.price
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "comparePrice"],
          message: "قیمت قبل از تخفیف باید بیشتر از قیمت باشد",
        });
      }
      // ترکیبِ فعال همیشه قیمت دارد (بدون قیمت فقط غیرفعال)؛ وزن فقط برای ترکیب جدید
      if (variant.isActive === true && variant.price < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "price"],
          message: NO_PRICE_ACTIVE_MESSAGE,
        });
      }
      if (
        !variant.id &&
        variant.isActive === true &&
        variant.shippingWeightGrams < 1
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "shippingWeightGrams"],
          message: "وزن ارسال ترکیب فعال باید مثبت باشد",
        });
      }
    });
  });

export type ProductInput = z.output<typeof productInputSchema>;
export type VariantInput = z.output<typeof variantInputSchema>;
/** ورودی خام فرم (قبل از parse) */
export type ProductFormInput = z.input<typeof productInputSchema>;

/**
 * متن شرایط مؤثر یک محصول: فقط برای خدمت؛ `serviceTerms` خالی ⇒ متن پیش‌فرض
 * (`service.defaultTerms`). برای کالای فیزیکی همیشه `null`.
 */
export function resolveServiceTerms(
  product: {
    kind: (typeof PRODUCT_KINDS)[number];
    serviceTerms: string | null;
  },
  defaultTerms: string,
): string | null {
  if (product.kind !== "SERVICE") return null;
  return product.serviceTerms?.trim() || defaultTerms.trim() || null;
}

/**
 * آیا محصول می‌تواند فعال شود؟ قیمت‌دار حداقل یک متغیر فعال لازم دارد؛
 * استعلامی هرگز متغیر ندارد و همیشه قابل فعال شدن است.
 */
export function canActivateProduct(product: {
  pricingMode: (typeof PRICING_MODES)[number];
  activeVariantCount: number;
}): boolean {
  return product.pricingMode === "INQUIRY" || product.activeVariantCount > 0;
}
