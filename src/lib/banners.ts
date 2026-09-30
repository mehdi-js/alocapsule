import { HERO_SLIDES } from "@/lib/site-content";

/**
 * تصاویر اسلایدر و بنرهای سایت (قابل تنظیم از پنل). هر تصویر دو نسخه دارد:
 * دسکتاپ و موبایل؛ چون کادر موبایل تقریباً مربع و کادر دسکتاپ پهن است،
 * یک عکس برای هر دو درست برش نمی‌خورد. نسخه‌ی موبایل اختیاری است (خالی ⇒
 * همان نسخه‌ی دسکتاپ با برش وسط).
 */

export const BANNERS_KEY = "site.banners";
export const MAX_HERO_SLIDES = 6;
/** عرض نسخه‌ی ذخیره‌شده (بزرگ‌تر کوچک می‌شود) */
export const BANNER_MAX_WIDTH = { desktop: 2400, mobile: 1080 } as const;

export type BannerVariant = keyof typeof BANNER_MAX_WIDTH;

export interface BannerImages {
  desktop: string | null;
  mobile: string | null;
}

export interface HeroSlideSetting extends BannerImages {
  id: string;
  /** متن کوچک بالای عنوان */
  eyebrow: string;
  /** هر خط یک سطر عنوان (حداکثر ۲ خط) */
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** مسیر داخلی سایت، مثل `/products` */
  ctaHref: string;
}

/** بنرهای تک‌تصویری (متن‌شان در کد است) */
export const BANNER_SLOTS = {
  promo: {
    label: "بنر تبلیغاتی صفحه‌ی اصلی",
    where: "صفحه‌ی اصلی، بنر پهن پایین صفحه",
    desktop: "2400 × 620",
    mobile: "1000 × 900",
    tip: "متن روی سمت راست (دسکتاپ) و پایین (موبایل) می‌نشیند؛ سوژه را سمت چپ / بالا بگذارید.",
  },
  story: {
    label: "تصویر «داستان علی حان»",
    where: "صفحه‌ی اصلی، کنار متن داستان برند",
    desktop: "1360 × 680",
    mobile: "1000 × 690",
    tip: "متنی روی تصویر نمی‌آید.",
  },
  aboutHero: {
    label: "بنر بالای «درباره ما»",
    where: "صفحه‌ی درباره ما",
    desktop: "2400 × 580",
    mobile: "1000 × 740",
    tip: "عنوان صفحه روی سمت راست (دسکتاپ) و پایین (موبایل) می‌نشیند.",
  },
  aboutStory: {
    label: "تصویر داستان «درباره ما»",
    where: "صفحه‌ی درباره ما، کنار متن «از یک کارگاه کوچک…»",
    desktop: "1360 × 760",
    mobile: "1000 × 740",
    tip: "متنی روی تصویر نمی‌آید.",
  },
  branchesHero: {
    label: "بنر بالای «شعب»",
    where: "صفحه‌ی آدرس شعب",
    desktop: "2400 × 580",
    mobile: "1000 × 740",
    tip: "عنوان صفحه روی سمت راست (دسکتاپ) و پایین (موبایل) می‌نشیند.",
  },
  contactHero: {
    label: "بنر بالای «تماس با ما»",
    where: "صفحه‌ی تماس با ما",
    desktop: "2400 × 580",
    mobile: "1000 × 740",
    tip: "عنوان صفحه روی سمت راست (دسکتاپ) و پایین (موبایل) می‌نشیند.",
  },
} as const;

export type BannerSlot = keyof typeof BANNER_SLOTS;
export const BANNER_SLOT_KEYS = Object.keys(BANNER_SLOTS) as BannerSlot[];

/** اسلایدر صفحه‌ی اصلی */
export const HERO_SIZES = {
  desktop: "2400 × 890",
  mobile: "1000 × 800",
  tip: "عنوان و دکمه روی سمت راست (دسکتاپ) و نیمه‌ی پایین (موبایل) می‌نشینند؛ سوژه‌ی اصلی عکس را سمت چپ / بالا قرار دهید.",
} as const;

export interface BannersSettings {
  heroSlides: HeroSlideSetting[];
  images: Record<BannerSlot, BannerImages>;
}

const EMPTY_IMAGES: BannerImages = { desktop: null, mobile: null };

export const DEFAULT_BANNERS: BannersSettings = {
  heroSlides: HERO_SLIDES.map((slide, index) => ({
    id: `default-${index + 1}`,
    eyebrow: slide.eyebrow,
    title: slide.title.join("\n"),
    subtitle: slide.text,
    ctaLabel: slide.cta.label,
    ctaHref: slide.cta.href,
    ...EMPTY_IMAGES,
  })),
  images: Object.fromEntries(
    BANNER_SLOT_KEYS.map((slot) => [slot, EMPTY_IMAGES]),
  ) as Record<BannerSlot, BannerImages>,
};

type Json = unknown;

function str(value: Json, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function url(value: Json): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: Json): value is Record<string, Json> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readImages(value: Json): BannerImages {
  if (!isRecord(value)) return EMPTY_IMAGES;
  return { desktop: url(value.desktop), mobile: url(value.mobile) };
}

/** مقدار ذخیره‌شده ⇒ تنظیمات کامل (ناقص ⇒ پیش‌فرض) */
export function parseBanners(stored: Json): BannersSettings {
  if (!isRecord(stored)) return DEFAULT_BANNERS;
  const slides = Array.isArray(stored.heroSlides)
    ? stored.heroSlides.filter(isRecord).map((slide, index) => ({
        id: str(slide.id, `slide-${index + 1}`),
        eyebrow: str(slide.eyebrow),
        title: str(slide.title),
        subtitle: str(slide.subtitle),
        ctaLabel: str(slide.ctaLabel),
        ctaHref: str(slide.ctaHref, "/products"),
        ...readImages(slide),
      }))
    : DEFAULT_BANNERS.heroSlides;
  const images = isRecord(stored.images) ? stored.images : {};
  return {
    heroSlides: slides.slice(0, MAX_HERO_SLIDES),
    images: Object.fromEntries(
      BANNER_SLOT_KEYS.map((slot) => [slot, readImages(images[slot])]),
    ) as Record<BannerSlot, BannerImages>,
  };
}

/** همه‌ی آدرس‌های تصویر (برای حذف فایل‌های بی‌استفاده پس از ذخیره) */
export function bannerImageUrls(settings: BannersSettings): string[] {
  const all = [
    ...settings.heroSlides.flatMap((slide) => [slide.desktop, slide.mobile]),
    ...BANNER_SLOT_KEYS.flatMap((slot) => [
      settings.images[slot].desktop,
      settings.images[slot].mobile,
    ]),
  ];
  return all.filter((value): value is string => value !== null);
}
