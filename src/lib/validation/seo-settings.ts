import { z } from "zod";

import { faqItemSchema, MAX_FAQ_ITEMS } from "./seo";

const text = (label: string, max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min, `${label} را وارد کنید`)
    .max(max, `${label} حداکثر ${max} کاراکتر باشد`);

/** آدرس کامل https یا مسیر داخلی؛ خالی مجاز */
const urlOrPath = (label: string) =>
  z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) =>
        value === "" ||
        /^\/(?!\/)\S*$/.test(value) ||
        /^https:\/\/[^\s/]+\S*$/i.test(value),
      { message: `${label}: مسیر داخلی (/…) یا آدرس https وارد کنید` },
    );

/** کد تأیید Search Console/Bing: فقط مقدار content، نه کل تگ */
const verificationCode = (label: string) =>
  z
    .string()
    .trim()
    .max(200)
    .transform((value) => {
      const match = /content=["']([^"']+)["']/i.exec(value);
      return match ? match[1]!.trim() : value;
    })
    .refine((value) => /^[\w.-]*$/.test(value), {
      message: `${label} فقط شامل حروف، عدد، خط تیره و نقطه باشد`,
    });

/** فرم «تنظیمات سئو» (SEO.md §۶.۵ و §۱۰.۵) */
export const seoSettingsSchema = z.object({
  brandName: text("نام برند", 60, 2),
  alternateNames: z
    .array(z.string().trim().max(60))
    .max(10)
    .transform((items) => [...new Set(items.filter(Boolean))]),
  titleTemplate: text("قالب عنوان", 80, 2).refine(
    (value) => value.includes("%s"),
    { message: "قالب عنوان باید %s (جای عنوان صفحه) را داشته باشد" },
  ),
  defaultDescription: text("توضیحات پیش‌فرض", 200, 20),
  defaultOgImage: urlOrPath("تصویر اشتراک‌گذاری پیش‌فرض"),
  homeTitle: text("عنوان صفحه‌ی اصلی", 80, 10),
  homeDescription: text("توضیحات متای صفحه‌ی اصلی", 200, 50),
  homeH1: text("H1 صفحه‌ی اصلی", 80, 3),
  homeContent: text("محتوای سئوی صفحه‌ی اصلی", 20_000),
  homeFaq: z.array(faqItemSchema).max(MAX_FAQ_ITEMS),
  orgLegalName: text("نام حقوقی", 150),
  orgLogoUrl: urlOrPath("لوگو"),
  verificationGoogle: verificationCode("کد تأیید گوگل"),
  verificationBing: verificationCode("کد تأیید بینگ"),
});

export type SeoSettingsInput = z.output<typeof seoSettingsSchema>;
export type SeoSettingsFormInput = z.input<typeof seoSettingsSchema>;
