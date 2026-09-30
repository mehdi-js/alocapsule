import { BRAND_NAME, todo } from "@/lib/brand";

/**
 * کلیدهای `Setting` متن‌های صفحه‌ی اصلی (FORK.md §۵.۳)، `home.*`. مقدار
 * نبود/نامعتبر ⇒ پیش‌فرض همین فایل که seed هم می‌نویسد. ادعای واقعی کسب‌وکار
 * `{{تکمیل توسط الو کپسول: …}}` است. `home.stats` پیش‌فرض خالی است و **خالی ⇒ کل
 * بخش آمار نمایش داده نمی‌شود**.
 */

export const HOME_KEYS = {
  heroTitle: "home.hero.title",
  heroSubtitle: "home.hero.subtitle",
  heroPrimaryCta: "home.hero.primaryCta",
  heroPrimaryHref: "home.hero.primaryHref",
  heroSecondaryCta: "home.hero.secondaryCta",
  stepsTitle: "home.steps.title",
  steps: "home.steps.items",
  featuredTitle: "home.featured.title",
  aboutTitle: "home.about.title",
  aboutText: "home.about.text",
  customersTitle: "home.customers.title",
  customers: "home.customers.items",
  stats: "home.stats",
  ctaTitle: "home.cta.title",
  ctaText: "home.cta.text",
} as const;

export interface HomeTextItem {
  title: string;
  text: string;
}

export interface HomeStat {
  label: string;
  value: string;
}

export interface HomeSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  /** مقصد دکمه‌ی اول (مسیر داخلی؛ پیش‌فرض دسته‌ی شارژ) */
  heroPrimaryHref: string;
  heroSecondaryCta: string;
  stepsTitle: string;
  steps: HomeTextItem[];
  featuredTitle: string;
  aboutTitle: string;
  aboutText: string;
  customersTitle: string;
  customers: HomeTextItem[];
  /** خالی ⇒ بخش آمار پنهان */
  stats: HomeStat[];
  ctaTitle: string;
  ctaText: string;
}

const DEFAULT_STEPS: HomeTextItem[] = [
  {
    title: "سفارش دهید",
    text: "شارژ کپسول را از فروشگاه انتخاب و سفارش را ثبت کنید.",
  },
  {
    title: "پرداخت کنید",
    text: "مبلغ را کارت‌به‌کارت واریز کنید یا از کیف پول حساب پرداخت کنید.",
  },
  {
    title: "کپسول پرشده را تحویل بگیرید",
    text: "کپسول پرشده با پیک به آدرس شما در تهران می‌رسد یا حضوری تحویل می‌گیرید.",
  },
  {
    title: "کپسول خالی را تحویل دهید",
    text: "کپسول خالی شما با کپسول پرشده‌ی هم‌اندازه و هم‌نوع تعویض می‌شود.",
  },
];

const DEFAULT_CUSTOMERS: HomeTextItem[] = [
  { title: "خانگی", text: "شارژ و خرید کپسول برای مصرف خانگی." },
  { title: "تجاری", text: "برای رستوران‌ها، کافه‌ها و کسب‌وکارهای کوچک." },
  { title: "صنعتی", text: "برای کارگاه‌ها و پروژه‌های ساختمانی." },
];

export const HOME_SETTING_DEFAULTS: Record<
  (typeof HOME_KEYS)[keyof typeof HOME_KEYS],
  string | HomeTextItem[] | HomeStat[]
> = {
  [HOME_KEYS.heroTitle]: "شارژ کپسول گاز، ساده و سریع",
  [HOME_KEYS.heroSubtitle]:
    "کپسول خالی شما با کپسول پرشده تعویض می‌شود؛ سفارش آنلاین، ارسال با پیک در تهران یا تحویل حضوری.",
  [HOME_KEYS.heroPrimaryCta]: "سفارش شارژ کپسول",
  [HOME_KEYS.heroPrimaryHref]: "/category/lpg-charge",
  [HOME_KEYS.heroSecondaryCta]: "تماس تلفنی",
  [HOME_KEYS.stepsTitle]: "شارژ کپسول چطور انجام می‌شود؟",
  [HOME_KEYS.steps]: DEFAULT_STEPS,
  [HOME_KEYS.featuredTitle]: "محصولات و خدمات منتخب",
  [HOME_KEYS.aboutTitle]: `درباره ${BRAND_NAME}`,
  [HOME_KEYS.aboutText]: `${BRAND_NAME} در زمینه‌ی تأمین، شارژ و ارسال کپسول گاز مایع (LPG) فعالیت می‌کند. ${todo("سابقه و معرفی کوتاه کسب‌وکار")}`,
  [HOME_KEYS.customersTitle]: "مشتریان ما",
  [HOME_KEYS.customers]: DEFAULT_CUSTOMERS,
  [HOME_KEYS.stats]: [],
  [HOME_KEYS.ctaTitle]: "برای سفارش با ما تماس بگیرید",
  [HOME_KEYS.ctaText]:
    "برای سفارش‌های تعدادی و صنعتی یا هر پرسشی، تلفنی با ما در ارتباط باشید.",
};

function requiredText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** فقط مسیر داخلی (`/…`)؛ غیر از آن ⇒ پیش‌فرض (لینک خارجی/javascript: هرگز) */
function internalHref(value: unknown, fallback: string): string {
  return typeof value === "string" && /^\/(?!\/)\S*$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** فهرست {title,text}؛ هر عنصر نامعتبر حذف می‌شود؛ نتیجه‌ی خالی ⇒ پیش‌فرض */
function textItems(value: unknown, fallback: HomeTextItem[]): HomeTextItem[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.flatMap((item) => {
    if (!isObject(item)) return [];
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const text = typeof item.text === "string" ? item.text.trim() : "";
    return title && text ? [{ title, text }] : [];
  });
  return items.length > 0 ? items : fallback;
}

/** آمار: آرایه‌ی خالی معتبر است (بخش پنهان می‌شود)؛ نامعتبر ⇒ خالی */
function stats(value: unknown): HomeStat[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const statValue = typeof item.value === "string" ? item.value.trim() : "";
    return label && statValue ? [{ label, value: statValue }] : [];
  });
}

export function parseHomeSettings(raw: Map<string, unknown>): HomeSettings {
  const d = HOME_SETTING_DEFAULTS;
  const str = (key: keyof typeof d) =>
    requiredText(raw.get(key), d[key] as string);
  return {
    heroTitle: str(HOME_KEYS.heroTitle),
    heroSubtitle: str(HOME_KEYS.heroSubtitle),
    heroPrimaryCta: str(HOME_KEYS.heroPrimaryCta),
    heroPrimaryHref: internalHref(
      raw.get(HOME_KEYS.heroPrimaryHref),
      d[HOME_KEYS.heroPrimaryHref] as string,
    ),
    heroSecondaryCta: str(HOME_KEYS.heroSecondaryCta),
    stepsTitle: str(HOME_KEYS.stepsTitle),
    steps: textItems(raw.get(HOME_KEYS.steps), DEFAULT_STEPS),
    featuredTitle: str(HOME_KEYS.featuredTitle),
    aboutTitle: str(HOME_KEYS.aboutTitle),
    aboutText: str(HOME_KEYS.aboutText),
    customersTitle: str(HOME_KEYS.customersTitle),
    customers: textItems(raw.get(HOME_KEYS.customers), DEFAULT_CUSTOMERS),
    stats: stats(raw.get(HOME_KEYS.stats)),
    ctaTitle: str(HOME_KEYS.ctaTitle),
    ctaText: str(HOME_KEYS.ctaText),
  };
}

export function defaultHomeSettings(): HomeSettings {
  return parseHomeSettings(new Map());
}
