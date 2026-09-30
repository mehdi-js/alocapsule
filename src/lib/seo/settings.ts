/**
 * کلیدهای `Setting` سئو (SEO.md §۶.۵) و مقادیر پیش‌فرض/seed آن‌ها.
 *
 * - `seo.brandName` تنها منبع نام برند است («علی حان» با فاصله)؛ املاهای دیگر
 *   فقط در `seo.alternateNames` (برای `alternateName` در schema سازمان).
 * - تلفن، ایمیل، آدرس و شبکه‌های اجتماعی سازمان (`org.phone/email/address/
 *   sameAs`) کلید جدا ندارند و از `site.content` خوانده می‌شوند تا دو منبع
 *   ناهمگام نشوند؛ فقط `org.legalName` و `org.logoUrl` اینجا هستند.
 * - مقدار خالی (`""`) یعنی «تنظیم نشده» و در HTML نمی‌آید.
 */

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

export const DEFAULT_BRAND_NAME = "علی حان";

/** جای‌نگهدار داده‌ی کسب‌وکار؛ `seo:audit` (فاز S5) وجودش را در HTML گزارش می‌کند */
export const COMPLETION_MARKER = "{{تکمیل توسط علی حان";

export function todo(what?: string): string {
  return what ? `${COMPLETION_MARKER}: ${what}}}` : `${COMPLETION_MARKER}}}`;
}

export function hasCompletionMarker(text: string): boolean {
  return text.includes(COMPLETION_MARKER);
}

/** `"%s | {brandName}"` ⇒ `"%s | علی حان"` (قالب title در Next.js) */
export function resolveTitleTemplate(template: string, brandName: string) {
  return template.replaceAll("{brandName}", brandName);
}

const HOME_DESCRIPTION =
  "خرید آنلاین باقلوای ترکی علی حان؛ باقلوا گردویی، پسته‌ای، هاویج، کادایف و شکلات دبی با مواد اولیه‌ی درجه‌یک و بسته‌بندی لوکس.";

/** بلوک محتوای سئوی صفحه‌ی اصلی (SEO.md §۱۴.۱)؛ قالب `lib/rich-text.ts` */
const HOME_CONTENT = [
  "## باقلوای ترکی علی حان؛ طعم اصیل، تازه و دست‌ساز",
  `باقلوای ترکی با لایه‌های نازک و ترد خمیر یوفکا، مغز پرملات و شربتی که نه زیاد شیرین است و نه کم، یکی از محبوب‌ترین شیرینی‌های شرقی است. در علی حان هر سینی باقلوا با مواد اولیه‌ی درجه‌یک تهیه می‌شود تا طعمی که روی میز شما می‌رسد، همان طعم اصیل باقلوای ترکی باشد. ${todo("یک یا دو جمله درباره‌ی سابقه و روش تولید")}`,
  "## خرید آنلاین باقلوا از علی حان",
  "برای خرید باقلوا کافی است محصول و وزن دلخواهتان را انتخاب کنید، سفارش را ثبت و مبلغ را کارت‌به‌کارت واریز کنید. پس از بارگذاری رسید و تأیید پرداخت، پیامک تأیید برایتان ارسال می‌شود و سفارش آماده‌ی ارسال می‌شود. امکان پرداخت از کیف پول حساب کاربری هم وجود دارد.",
  "## انواع باقلوا و شیرینی ترکی",
  [
    "- [باقلوا گردویی](/products/baklava-gerdouyi)؛ کلاسیک و اصیل با مغز گردوی تازه",
    "- [باقلوا پسته‌ای](/products/baklava-pesteei)؛ لوکس و مجلسی با پسته‌ی سبز",
    "- [باقلوا مخلوط](/products/baklava-makhlut)؛ گردویی و پسته‌ای در یک جعبه",
    "- [شیرینی هاویج](/category/havij)؛ برش‌های لوزی، با یا بدون سرشیر",
    "- [کادایف پسته‌ای](/products/kadayif-pesteei)؛ رشته‌های طلایی و ترد دور مغز پسته",
    "- [سوتلاوا](/products/sutlava)؛ باقلوای سرد با شربت شیری",
    "- [کنافه پنیری](/products/kanafeh-panir)، [بامیه ترکی](/products/bamiyeh-torki) و [شکلات دبی](/products/chocolate-dubai)",
  ].join("\n"),
  "## بسته‌بندی و ارسال",
  `باقلواهای علی حان در بسته‌بندی‌های شیک و مناسب هدیه آماده می‌شوند. ${todo("مناطق تحت پوشش ارسال، روش‌ها و زمان تقریبی")}`,
].join("\n\n");

/** سوالات متداول صفحه‌ی اصلی (SEO.md §۱۴.۲) */
const HOME_FAQ: SeoFaqItem[] = [
  {
    question: "پرداخت سفارش چگونه انجام می‌شود؟",
    answer:
      "پس از ثبت سفارش، مبلغ را به کارت شرکت واریز و تصویر رسید را در سایت بارگذاری کنید. پس از تأیید، پیامک دریافت می‌کنید. پرداخت از کیف پول حساب کاربری هم ممکن است.",
  },
  { question: "به شهرستان ارسال دارید؟", answer: todo() },
  { question: "هزینه و زمان ارسال چقدر است؟", answer: todo() },
  {
    question: "باقلوا را چطور نگهداری کنیم و تا چه مدت تازه می‌ماند؟",
    answer: todo(),
  },
  {
    question: "آیا امکان سفارش برای هدیه و مراسم وجود دارد؟",
    answer: todo(),
  },
  {
    question: "تفاوت باقلوای ترکی با باقلوای ایرانی چیست؟",
    answer: todo(),
  },
];

/**
 * مقادیر seed؛ فقط وقتی کلید وجود ندارد نوشته می‌شوند (ویرایش ادمین حفظ
 * می‌شود).
 */
export const SEO_SETTING_DEFAULTS: Record<
  (typeof SEO_KEYS)[keyof typeof SEO_KEYS],
  string | string[] | SeoFaqItem[]
> = {
  [SEO_KEYS.brandName]: DEFAULT_BRAND_NAME,
  [SEO_KEYS.alternateNames]: ["علیحان", "علی‌حان", "Alihan", "ALIHAN"],
  [SEO_KEYS.titleTemplate]: "%s | {brandName}",
  [SEO_KEYS.defaultDescription]: HOME_DESCRIPTION,
  // تا فاز S2/S3 تصویر OG پیش‌فرض نداریم
  [SEO_KEYS.defaultOgImage]: "",
  [SEO_KEYS.homeTitle]: "خرید باقلوای ترکی اصل و تازه | علی حان",
  [SEO_KEYS.homeDescription]: HOME_DESCRIPTION,
  [SEO_KEYS.homeH1]: "خرید باقلوای ترکی علی حان",
  [SEO_KEYS.homeContent]: HOME_CONTENT,
  [SEO_KEYS.homeFaq]: HOME_FAQ,
  [SEO_KEYS.orgLegalName]: todo("نام حقوقی ثبت‌شده‌ی کسب‌وکار"),
  [SEO_KEYS.orgLogoUrl]: "/brand/logo-white.webp",
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
