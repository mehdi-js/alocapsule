/**
 * کلیدهای `Setting` سئو (SEO.md §۶.۵) و مقادیر پیش‌فرض/seed آن‌ها.
 *
 * - `seo.brandName` تنها منبع نام برند است (مقدار پیش‌فرض از `SITE.name`)؛ املاهای دیگر
 *   فقط در `seo.alternateNames` (برای `alternateName` در schema سازمان).
 * - تلفن، ایمیل، آدرس و شبکه‌های اجتماعی سازمان (`org.phone/email/address/
 *   sameAs`) کلید جدا ندارند و از `site.content` خوانده می‌شوند تا دو منبع
 *   ناهمگام نشوند؛ فقط `org.legalName` و `org.logoUrl` اینجا هستند.
 * - مقدار خالی (`""`) یعنی «تنظیم نشده» و در HTML نمی‌آید.
 */

import { BRAND_NAME, todo } from "@/lib/brand";
import {
  HOME_CONTENT as HOMEPAGE_CONTENT,
  HOME_FAQ as HOMEPAGE_FAQ,
} from "@/lib/seo/home-content";

export { COMPLETION_MARKER, hasCompletionMarker, todo } from "@/lib/brand";

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export const SEO_KEYS = {
  brandName: "seo.brandName",
  alternateNames: "seo.alternateNames",
  titleTemplate: "seo.titleTemplate",
  defaultDescription: "seo.defaultDescription",
  defaultOgImage: "seo.defaultOgImage",
  homeTitle: "seo.home.title",
  homeDescription: "seo.home.description",
  homeH1: "seo.home.h1",
  homeContent: "seo.home.content",
  homeFaq: "seo.home.faq",
  orgLegalName: "org.legalName",
  orgLogoUrl: "org.logoUrl",
  verificationGoogle: "verification.google",
  verificationBing: "verification.bing",
} as const;

export const DEFAULT_BRAND_NAME = BRAND_NAME;

/** `"%s | {brandName}"` ⇒ `"%s | {نام برند}"` (قالب title در Next.js) */
export function resolveTitleTemplate(template: string, brandName: string) {
  return template.replaceAll("{brandName}", brandName);
}

/** SEO.md §۲.۱: توضیحات متای صفحه‌ی اصلی */
const HOME_DESCRIPTION =
  "شارژ کپسول گاز ۱۱ تا ۵۰ کیلویی پرسی و بوتان با تعویض سریع، خرید کپسول گاز خالی یا پرشده و پیک‌نیک؛ ارسال فوری ۱ تا ۴ ساعته در تهران.";

/** تگ‌لاین برند در متای پیش‌فرض و `Organization.description` (SEO.md §۳.۲) */
export const BRAND_TAGLINE = "تأمین، شارژ و ارسال کپسول گاز مایع (LPG)";

/** SEO.md §۳.۲: املای نادرست لاتین (بدون «c») هرگز استفاده نمی‌شود؛ نگهبانش در `seed-content.test.ts` است */
export const BRAND_ALTERNATE_NAMES = ["Alo Capsule", "الوکپسول", "alocapsule"];

/**
 * بلوک محتوای سئوی صفحه‌ی اصلی و سوالات متداول (SEO.md §۱۰.۱ و §۱۰.۴؛ متن‌ها
 * در `src/lib/seo/home-content.ts`). مقدارهای ارسال با توکن `[[…]]` جایگزین می‌شوند.
 */
const HOME_CONTENT = HOMEPAGE_CONTENT;
const HOME_FAQ: SeoFaqItem[] = HOMEPAGE_FAQ;

/**
 * مقادیر seed؛ فقط وقتی کلید وجود ندارد نوشته می‌شوند (ویرایش ادمین حفظ
 * می‌شود).
 */
export const SEO_SETTING_DEFAULTS: Record<
  (typeof SEO_KEYS)[keyof typeof SEO_KEYS],
  string | string[] | SeoFaqItem[]
> = {
  [SEO_KEYS.brandName]: DEFAULT_BRAND_NAME,
  [SEO_KEYS.alternateNames]: BRAND_ALTERNATE_NAMES,
  [SEO_KEYS.titleTemplate]: "%s | {brandName}",
  [SEO_KEYS.defaultDescription]: `${BRAND_NAME}؛ ${BRAND_TAGLINE}. سفارش آنلاین، ارسال با پیک یا تحویل حضوری در تهران.`,
  // تا فاز S2/S3 تصویر OG پیش‌فرض نداریم
  [SEO_KEYS.defaultOgImage]: "",
  [SEO_KEYS.homeTitle]: `شارژ کپسول گاز و خرید کپسول گاز در تهران | ${DEFAULT_BRAND_NAME}`,
  [SEO_KEYS.homeDescription]: HOME_DESCRIPTION,
  [SEO_KEYS.homeH1]: "شارژ کپسول گاز و خرید کپسول گاز در تهران",
  [SEO_KEYS.homeContent]: HOME_CONTENT,
  [SEO_KEYS.homeFaq]: HOME_FAQ,
  [SEO_KEYS.orgLegalName]: todo("نام حقوقی ثبت‌شده‌ی کسب‌وکار"),
  [SEO_KEYS.orgLogoUrl]: "/brand/logo.png",
  [SEO_KEYS.verificationGoogle]: "",
  [SEO_KEYS.verificationBing]: "",
};

/** تنظیمات سئوی خوانده‌شده (مقدار نبود/نامعتبر ⇒ پیش‌فرض) */
export interface SeoSettings {
  brandName: string;
  alternateNames: string[];
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage: string;
  home: {
    title: string;
    description: string;
    h1: string;
    content: string;
    faq: SeoFaqItem[];
  };
  orgLegalName: string;
  orgLogoUrl: string;
  verificationGoogle: string;
  verificationBing: string;
}

function text(value: unknown, fallback: string, allowEmpty = false): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || allowEmpty ? trimmed : fallback;
}

function stringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
}

function faqList(value: unknown, fallback: SeoFaqItem[]): SeoFaqItem[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter(
    (item): item is SeoFaqItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SeoFaqItem).question === "string" &&
      typeof (item as SeoFaqItem).answer === "string",
  );
}

const DEFAULTS = SEO_SETTING_DEFAULTS as Record<string, unknown>;
const defaultText = (key: string) => DEFAULTS[key] as string;

export function parseSeoSettings(raw: Map<string, unknown>): SeoSettings {
  const get = (key: string) => raw.get(key);
  return {
    brandName: text(get(SEO_KEYS.brandName), DEFAULT_BRAND_NAME),
    alternateNames: stringList(
      get(SEO_KEYS.alternateNames),
      DEFAULTS[SEO_KEYS.alternateNames] as string[],
    ),
    titleTemplate: text(
      get(SEO_KEYS.titleTemplate),
      defaultText(SEO_KEYS.titleTemplate),
    ),
    defaultDescription: text(
      get(SEO_KEYS.defaultDescription),
      defaultText(SEO_KEYS.defaultDescription),
    ),
    defaultOgImage: text(get(SEO_KEYS.defaultOgImage), "", true),
    home: {
      title: text(get(SEO_KEYS.homeTitle), defaultText(SEO_KEYS.homeTitle)),
      description: text(
        get(SEO_KEYS.homeDescription),
        defaultText(SEO_KEYS.homeDescription),
      ),
      h1: text(get(SEO_KEYS.homeH1), defaultText(SEO_KEYS.homeH1)),
      content: text(get(SEO_KEYS.homeContent), "", true),
      faq: faqList(
        get(SEO_KEYS.homeFaq),
        DEFAULTS[SEO_KEYS.homeFaq] as SeoFaqItem[],
      ),
    },
    orgLegalName: text(get(SEO_KEYS.orgLegalName), "", true),
    orgLogoUrl: text(
      get(SEO_KEYS.orgLogoUrl),
      defaultText(SEO_KEYS.orgLogoUrl),
    ),
    verificationGoogle: text(get(SEO_KEYS.verificationGoogle), "", true),
    verificationBing: text(get(SEO_KEYS.verificationBing), "", true),
  };
}

/** برای build بدون دیتابیس و وقتی هیچ کلیدی ذخیره نشده */
export function defaultSeoSettings(): SeoSettings {
  return parseSeoSettings(
    new Map(Object.entries(SEO_SETTING_DEFAULTS)) as Map<string, unknown>,
  );
}
