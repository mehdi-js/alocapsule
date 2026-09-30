import { z } from "zod";

import { MAX_SLUG_LENGTH, SLUG_PATTERN } from "@/lib/slug";

/** نامک لاتین الزامی محصول/دسته (SEO.md §۴.۲) */
export const latinSlugSchema = z
  .string({ error: "نامک (slug) را به انگلیسی وارد کنید" })
  .trim()
  .toLowerCase()
  .min(1, "نامک (slug) را به انگلیسی وارد کنید؛ مثلاً example-product")
  .max(MAX_SLUG_LENGTH, `نامک حداکثر ${MAX_SLUG_LENGTH} کاراکتر باشد`)
  .regex(
    SLUG_PATTERN,
    "نامک فقط حروف کوچک انگلیسی، عدد و خط تیره (-) باشد؛ مثلاً example-product",
  );

function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} حداکثر ${max} کاراکتر باشد`)
    .nullish()
    .transform((value) => value || null);
}

export const MAX_FAQ_ITEMS = 20;
export const MAX_SECONDARY_KEYWORDS = 10;

export const faqItemSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "سوال را بنویسید")
    .max(200, "سوال حداکثر ۲۰۰ کاراکتر باشد"),
  answer: z
    .string()
    .trim()
    .min(3, "پاسخ را بنویسید")
    .max(2000, "پاسخ حداکثر ۲۰۰۰ کاراکتر باشد"),
});

export type FaqItem = z.output<typeof faqItemSchema>;

/** آدرس کامل https یا مسیر داخلی `/…` (فقط محصول؛ معمولاً خالی) */
export const canonicalUrlSchema = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null)
  .refine(
    (value) =>
      value === null ||
      /^\/(?!\/)\S*$/.test(value) ||
      /^https?:\/\/[^\s/]+\S*$/i.test(value),
    { message: "آدرس کامل (https://…) یا مسیر داخلی (/…) وارد کنید" },
  );

/** فیلدهای سئوی مشترک محصول و دسته (SEO.md §۶) */
export const seoFieldsSchema = {
  seoTitle: optionalText("عنوان سئو", 70),
  metaDescription: optionalText("توضیحات متا", 160),
  focusKeyword: optionalText("کلمه‌ی کانونی", 80),
  secondaryKeywords: z
    .array(z.string().trim().max(80, "هر کلمه حداکثر ۸۰ کاراکتر باشد"))
    .default([])
    .transform((items) => [...new Set(items.filter(Boolean))])
    .refine((items) => items.length <= MAX_SECONDARY_KEYWORDS, {
      message: `حداکثر ${MAX_SECONDARY_KEYWORDS} کلمه‌ی ثانویه`,
    }),
  noindex: z.boolean().default(false),
  faq: z
    .array(faqItemSchema)
    .max(MAX_FAQ_ITEMS, `حداکثر ${MAX_FAQ_ITEMS} سوال`)
    .default([]),
};

/** «عبارت اول، عبارت دوم, عبارت سوم» ⇒ آرایه (ویرگول فارسی/لاتین یا خط جدید) */
export function splitKeywords(text: string): string[] {
  return text
    .split(/[,،\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
