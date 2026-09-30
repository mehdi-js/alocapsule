import { BRAND_NAME, BRAND_SLUG, todo } from "@/lib/brand";

/**
 * متن‌ها و اطلاعات ثابت سایت. `SITE` تنها فایل پیکربندی برند در کد است: نام
 * برند، شناسه‌ی فنی (slug) و آدرس سایت فقط از همین‌جا خوانده می‌شوند.
 *
 * اطلاعات تماس، شبکه‌های اجتماعی، شعب، آمار «درباره ما»، نوار اعتماد و متن
 * ارسال از تنظیمات ادمین (`lib/site-settings.ts`) خوانده می‌شوند و مقادیر
 * این فایل فقط پیش‌فرض آن‌هاست. بقیه‌ی متن‌های صفحه همین‌جا می‌مانند.
 *
 * ⚠️ متن‌های این فایل پیش‌نویس‌اند. هر ادعای واقعی کسب‌وکار (سابقه، آمار،
 * آدرس، زمان ارسال) با `todo()` علامت خورده و باید توسط الو کپسول تکمیل شود.
 */

export const SITE = {
  name: BRAND_NAME,
  /** شناسه‌ی فنی لاتین (هرگز در UI نمایش داده نمی‌شود) */
  slug: BRAND_SLUG,
  tagline: "شارژ و ارسال کپسول گاز در تهران",
  description: `فروشگاه آنلاین ${BRAND_NAME}؛ شارژ، خرید و ارسال کپسول گاز مایع (LPG) در تهران.`,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const CONTACT = {
  phone: "۰۹۱۲۶۲۷۰۵۹۵",
  phoneHref: "tel:+989126270595",
  email: todo("ایمیل"),
  address: todo("آدرس محل تحویل حضوری"),
} as const;

export const SOCIAL = [
  { label: "اینستاگرام", href: "https://instagram.com/", icon: "instagram" },
  { label: "تلگرام", href: "https://t.me/", icon: "telegram" },
  { label: "واتساپ", href: "https://wa.me/", icon: "whatsapp" },
] as const;

/** لینک‌های منوی اصلی (وبلاگ طبق سند به نسخه ۲ موکول شده است) */
export const NAV_LINKS = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/products", label: "فروشگاه" },
  { href: "/branches", label: "آدرس شعب" },
  { href: "/about", label: "درباره ما" },
  { href: "/contact", label: "تماس با ما" },
] as const;

export interface HeroSlide {
  eyebrow: string;
  title: string[];
  text: string;
  cta: { label: string; href: string };
  imageLabel: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: "شارژ کپسول گاز",
    title: ["شارژ کپسول گاز", "در تهران"],
    text: "کپسول خالی شما با کپسول پرشده و آماده‌ی مصرف تعویض می‌شود؛ سفارش آنلاین، با پیک یا تحویل حضوری.",
    cta: { label: "مشاهده محصولات", href: "/products" },
    imageLabel: "اسلاید ۱ — شارژ کپسول",
  },
  {
    eyebrow: "کپسول گاز نو",
    title: ["خرید کپسول گاز", "در اندازه‌های مختلف"],
    text: "کپسول نو را آنلاین سفارش دهید و درب محل تحویل بگیرید.",
    cta: { label: "مشاهده محصولات", href: "/products" },
    imageLabel: "اسلاید ۲ — کپسول نو",
  },
  {
    eyebrow: "پیک‌نیک",
    title: ["لوازم گازی", "برای سفر و پیک‌نیک"],
    text: `کپسول و لوازم پیک‌نیک ${BRAND_NAME} را ببینید و سفارش دهید.`,
    cta: { label: "مشاهده محصولات", href: "/products" },
    imageLabel: "اسلاید ۳ — پیک‌نیک",
  },
];

export const TRUST_ITEMS = [
  {
    icon: "shield",
    title: "تعویض کپسول پرشده",
    subtitle: "کپسول خالی با کپسول پرشده",
  },
  { icon: "truck", title: "ارسال با پیک", subtitle: "یا تحویل حضوری" },
  { icon: "gift", title: "پرداخت ساده", subtitle: "کارت‌به‌کارت یا کیف پول" },
] as const;

export const BRAND_STORY = {
  eyebrow: "درباره ما",
  title: `درباره ${SITE.name}`,
  text: `${SITE.name} در زمینه‌ی تأمین، شارژ و ارسال کپسول گاز مایع (LPG) فعالیت می‌کند. ${todo("سابقه و داستان شکل‌گیری برند")}`,
  cta: { label: `درباره ${SITE.name}`, href: "/about" },
  imageLabel: "تصویر نمونه",
} as const;

export const PROMO_BANNER = {
  eyebrow: "سفارش تعدادی",
  title: ["نیاز به کپسول", "بیشتری دارید؟"],
  text: "برای سفارش‌های تعدادی، کارگاهی و صنعتی با ما تماس بگیرید.",
  cta: { label: "تماس با ما", href: "/contact" },
  imageLabel: "بنر نمونه",
} as const;

export const ABOUT_PAGE = {
  eyebrow: `درباره ${SITE.name}`,
  title: ["تأمین، شارژ و ارسال", "کپسول گاز مایع"],
  story: {
    title: "داستان ما",
    paragraphs: [
      `${SITE.name} ${todo("سال شروع فعالیت و داستان شکل‌گیری برند")}`,
      todo("روش کار، تجهیزات و آنچه الو کپسول را متفاوت می‌کند"),
    ],
    imageLabel: "تصویر نمونه",
  },
  /** آمار «درباره ما» پیش‌فرض خالی است (عدد ساختگی نمی‌گذاریم)؛ ادمین ۴ عدد واقعی وارد می‌کند. */
  stats: [] as { value: string; label: string }[],
  values: [
    {
      icon: "shield",
      title: "تعویض کپسول پرشده",
      text: "کپسول خالی شما با کپسولِ از قبل پرشده و آماده‌ی مصرف هم‌اندازه و هم‌نوع تعویض می‌شود.",
    },
    {
      icon: "truck",
      title: "ارسال یا تحویل حضوری",
      text: "سفارش را با پیک در تهران دریافت کنید یا به‌صورت حضوری تحویل بگیرید.",
    },
    {
      icon: "gift",
      title: "پرداخت ساده",
      text: "پرداخت کارت‌به‌کارت یا از کیف پول حساب کاربری، بدون نیاز به درگاه آنلاین.",
    },
  ],
  cta: {
    title: "سفارش تعدادی و صنعتی",
    text: "برای کارگاه‌ها، پروژه‌های ساختمانی و سفارش‌های تعدادی با ما تماس بگیرید.",
    label: "تماس با ما",
    href: "/contact",
  },
} as const;

/** متن ثابت آکاردئون «ارسال و نگهداری» در صفحه‌ی محصول */
export const SHIPPING_NOTE = `سفارش‌ها پس از تأیید پرداخت آماده و در شهر تهران با پیک ارسال یا به‌صورت حضوری تحویل داده می‌شوند. هنگام تحویل، کپسول خالی خود را به مأمور ارسال یا در محل تحویل حضوری تحویل دهید. ${todo("زمان تقریبی آماده‌سازی و تحویل")}`;
