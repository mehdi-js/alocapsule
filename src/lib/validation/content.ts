import { z } from "zod";

import { faqItemSchema, latinSlugSchema, MAX_FAQ_ITEMS } from "./seo";

/**
 * صفحات ثابت و ریدایرکت‌ها (SEO.md فاز S4).
 */

function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} حداکثر ${max} کاراکتر باشد`)
    .nullish()
    .transform((value) => value || null);
}

/** مسیرهای خود اپلیکیشن که صفحه‌ی ثابت نمی‌تواند بگیرد */
export const RESERVED_PAGE_SLUGS = new Set([
  "products",
  "category",
  "cart",
  "checkout",
  "account",
  "login",
  "set-password",
  "admin",
  "api",
  "menu",
  "maintenance",
  "sitemap",
  "robots",
  "search",
]);

export const pageInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "عنوان صفحه حداقل ۲ کاراکتر باشد")
    .max(120, "عنوان حداکثر ۱۲۰ کاراکتر باشد"),
  slug: latinSlugSchema.refine((slug) => !RESERVED_PAGE_SLUGS.has(slug), {
    message: "این نامک برای بخش دیگری از سایت رزرو است",
  }),
  content: z.string().trim().max(50_000, "متن صفحه حداکثر ۵۰۰۰۰ کاراکتر باشد"),
  seoTitle: optionalText("عنوان سئو", 70),
  metaDescription: optionalText("توضیحات متا", 160),
  noindex: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  faq: z.array(faqItemSchema).max(MAX_FAQ_ITEMS).default([]),
});

export type PageInput = z.output<typeof pageInputSchema>;
export type PageFormInput = z.input<typeof pageInputSchema>;

const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^https:\/\/[^\s/]+\S*$/i.test(value), {
      message: `${label}: آدرس کامل https وارد کنید`,
    })
    .transform((value) => value || null);

const coordinate = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} باید عدد باشد` })
    .min(min, `${label} خارج از محدوده است`)
    .max(max, `${label} خارج از محدوده است`)
    .nullable();

export const redirectInputSchema = z
  .object({
    fromPath: z.string().trim().min(1, "آدرس مبدأ را وارد کنید").max(500),
    toPath: z.string().trim().max(500),
    statusCode: z.union([z.literal(301), z.literal(410)]),
    note: optionalText("یادداشت", 200),
    isActive: z.boolean().default(true),
  })
  .refine((input) => input.statusCode === 410 || input.toPath !== "", {
    message: "آدرس مقصد را وارد کنید",
    path: ["toPath"],
  });

export type RedirectInput = z.output<typeof redirectInputSchema>;
export type RedirectFormInput = z.input<typeof redirectInputSchema>;
