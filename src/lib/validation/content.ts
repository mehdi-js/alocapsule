import { z } from "zod";

import { TIME_PATTERN, WEEK_DAYS } from "@/lib/branch-hours";

import { faqItemSchema, latinSlugSchema, MAX_FAQ_ITEMS } from "./seo";

/**
 * صفحات ثابت، شعب و ریدایرکت‌ها (SEO.md فاز S4).
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
  "branches",
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

export const branchInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "نام شعبه حداقل ۲ کاراکتر باشد")
    .max(80, "نام شعبه حداکثر ۸۰ کاراکتر باشد"),
  slug: latinSlugSchema,
  city: z.string().trim().min(2, "شهر را وارد کنید").max(60),
  district: optionalText("محله", 60),
  address: z
    .string()
    .trim()
    .min(5, "آدرس را کامل وارد کنید")
    .max(300, "آدرس حداکثر ۳۰۰ کاراکتر باشد"),
  phone: z.string().trim().min(5, "تلفن را وارد کنید").max(40),
  openingHours: z.object({
    days: z
      .array(
        z
          .object({
            day: z.enum(
              WEEK_DAYS.map((day) => day.key) as [string, ...string[]],
            ),
            open: z
              .string()
              .regex(TIME_PATTERN, "ساعت را به شکل ۱۰:۰۰ وارد کنید"),
            close: z
              .string()
              .regex(TIME_PATTERN, "ساعت را به شکل ۲۳:۰۰ وارد کنید"),
          })
          .refine((day) => day.open !== day.close, {
            message: "ساعت شروع و پایان یکی است",
            path: ["close"],
          }),
      )
      .max(7),
    note: z.string().trim().max(200, "توضیح حداکثر ۲۰۰ کاراکتر باشد"),
  }),
  latitude: coordinate("عرض جغرافیایی", 24, 40),
  longitude: coordinate("طول جغرافیایی", 44, 64),
  mapLinks: z.object({
    neshan: httpsUrl("لینک نشان"),
    balad: httpsUrl("لینک بلد"),
    google: httpsUrl("لینک گوگل‌مپ"),
  }),
  description: optionalText("توضیحات", 5000),
  seoTitle: optionalText("عنوان سئو", 70),
  metaDescription: optionalText("توضیحات متا", 160),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type BranchInput = z.output<typeof branchInputSchema>;
export type BranchFormInput = z.input<typeof branchInputSchema>;

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
