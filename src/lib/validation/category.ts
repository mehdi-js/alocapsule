import { z } from "zod";

import { latinSlugSchema, seoFieldsSchema } from "./seo";

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "نام دسته‌بندی حداقل ۲ کاراکتر باشد")
    .max(80, "نام دسته‌بندی حداکثر ۸۰ کاراکتر باشد"),
  slug: latinSlugSchema,
  parentId: z
    .string()
    .nullish()
    .transform((value) => value || null),
  description: z
    .string()
    .trim()
    .max(300, "زیرعنوان حداکثر ۳۰۰ کاراکتر باشد")
    .nullish()
    .transform((value) => value || null),
  sortOrder: z
    .number({ error: "ترتیب نمایش باید عدد صحیح باشد" })
    .int("ترتیب نمایش باید عدد صحیح باشد")
    .min(0)
    .max(9999)
    .default(0),
  isActive: z.boolean().optional(),
  /** نمایش در بخش دسته‌های صفحه‌ی اصلی؛ `undefined` ⇒ دست‌نخورده */
  isFeatured: z.boolean().optional(),
  /** یک پاراگراف کوتاه بالای فهرست محصولات */
  introText: z
    .string()
    .trim()
    .max(1000, "متن معرفی حداکثر ۱۰۰۰ کاراکتر باشد")
    .nullish()
    .transform((value) => value || null),
  /** متن بلند زیر فهرست (rich text با `##`) */
  bottomContent: z
    .string()
    .trim()
    .max(20_000, "متن پایین صفحه حداکثر ۲۰۰۰۰ کاراکتر باشد")
    .nullish()
    .transform((value) => value || null),
  ...seoFieldsSchema,
});

export type CategoryInput = z.output<typeof categoryInputSchema>;
export type CategoryFormInput = z.input<typeof categoryInputSchema>;
