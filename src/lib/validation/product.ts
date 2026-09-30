import { z } from "zod";

import { canonicalUrlSchema, latinSlugSchema, seoFieldsSchema } from "./seo";

/** سقف Int در Postgres */
export const MAX_INT = 2_147_483_647;
export const MAX_VARIANTS = 30;

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
    shortDescription: optionalText("توضیح کوتاه", 300),
    description: optionalText("توضیحات", 10_000),
    ...seoFieldsSchema,
    canonicalUrl: canonicalUrlSchema,
    sortOrder: intField("ترتیب نمایش", 0, 9999).default(0),
    /** فقط هنگام ساخت؛ در ویرایش با کلید فوری عوض می‌شود. */
    isActive: z.boolean().optional(),
    variants: z
      .array(variantInputSchema)
      .min(1, "حداقل یک متغیر لازم است")
      .max(MAX_VARIANTS, `حداکثر ${MAX_VARIANTS} متغیر مجاز است`),
  })
  .superRefine((product, ctx) => {
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
