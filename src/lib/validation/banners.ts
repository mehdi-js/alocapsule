import { z } from "zod";

import {
  BANNER_SLOT_KEYS,
  type BannerSlot,
  MAX_HERO_SLIDES,
} from "@/lib/banners";
import { toPersianDigits } from "@/lib/utils";

/** اعتبارسنجی اسلایدر و بنرها (پنل مدیریت) */

const text = (label: string, max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min, `${label} را وارد کنید`)
    .max(max, `${label} حداکثر ${toPersianDigits(max)} کاراکتر باشد`);

/** آدرس تصویر آپلودشده؛ مالکیت (فایل بنرِ همین سایت) در سرویس بررسی می‌شود */
const imageUrl = z.string().max(400).nullable();

const images = z.object({ desktop: imageUrl, mobile: imageUrl });

export const heroSlideSchema = z.object({
  id: z.string().min(1).max(60),
  eyebrow: text("متن بالای عنوان", 40),
  title: text("عنوان", 70, 2).refine(
    (value) => value.split("\n").filter((line) => line.trim()).length <= 2,
    "عنوان حداکثر ۲ خط باشد",
  ),
  subtitle: text("زیرعنوان", 200),
  ctaLabel: text("متن دکمه", 30, 2),
  ctaHref: z
    .string()
    .trim()
    .regex(
      /^\/(?!\/)[^\s]*$/,
      "لینک دکمه باید مسیر داخلی سایت باشد، مثل /products",
    ),
  desktop: imageUrl,
  mobile: imageUrl,
});

export const bannersSchema = z.object({
  heroSlides: z
    .array(heroSlideSchema)
    .min(1, "دست‌کم یک اسلاید لازم است")
    .max(
      MAX_HERO_SLIDES,
      `حداکثر ${toPersianDigits(MAX_HERO_SLIDES)} اسلاید مجاز است`,
    ),
  images: z.object(
    Object.fromEntries(
      BANNER_SLOT_KEYS.map((slot) => [slot, images]),
    ) as Record<BannerSlot, typeof images>,
  ),
});

export type BannersInput = z.output<typeof bannersSchema>;
export type BannersFormInput = z.input<typeof bannersSchema>;
