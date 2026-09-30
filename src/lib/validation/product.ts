import { z } from "zod";

import { canonicalUrlSchema, latinSlugSchema, seoFieldsSchema } from "./seo";

/** سقف Int در Postgres */
export const MAX_INT = 2_147_483_647;
export const MAX_VARIANTS = 30;
export const MAX_SERVICE_TERMS_LENGTH = 5000;

export const PRODUCT_KINDS = ["PHYSICAL", "SERVICE"] as const;
export const PRICING_MODES = ["FIXED", "INQUIRY"] as const;

export const FIXED_NEEDS_VARIANT_MESSAGE =
  "محصول قیمت‌دار حداقل یک متغیر (با قیمت) لازم دارد";

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

export const variantInputSchema = z.object({
  /** خالی ⇒ متغیر جدید */
  id: z.string().min(1).optional(),
  unitValue: intField("مقدار واحد", 1, 1_000_000),
  title: optionalText("عنوان", 60),
  sku: optionalText("کد کالا (SKU)", 40),
  price: intField("قیمت", 1, MAX_INT),
  comparePrice: intField("قیمت قبل از تخفیف", 1, MAX_INT)
    .nullish()
    .transform((value) => value ?? null),
  shippingWeightGrams: intField("وزن ارسال", 1, 10_000_000),
  /** فقط برای متغیر جدید؛ وضعیت متغیر موجود با کلید فوری عوض می‌شود. */
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
    unit: z.enum(["GRAM", "PIECE"], { error: "واحد فروش را انتخاب کنید" }),
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
    /**
     * قیمت‌دار ⇒ حداقل یک متغیر. استعلامی ⇒ متغیر ندارد و ورودی متغیرها نادیده
     * گرفته می‌شود (متغیرهای موجود غیرفعال می‌شوند، حذف نمی‌شوند).
     */
    variants: z
      .array(variantInputSchema)
      .max(MAX_VARIANTS, `حداکثر ${MAX_VARIANTS} متغیر مجاز است`)
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
    const seen = new Set<number>();
    product.variants.forEach((variant, index) => {
      if (seen.has(variant.unitValue)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "unitValue"],
          message: "مقدار واحد تکراری است",
        });
      }
      seen.add(variant.unitValue);

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
