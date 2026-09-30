import { todo } from "@/lib/brand";

/**
 * کلیدهای `Setting` کسب‌وکار (FORK.md §۳.۶): تماس، تحویل حضوری، شرایط خدمت و
 * نمایش کاتالوگ. مقدار نبود/نامعتبر ⇒ پیش‌فرض همین فایل، که seed هم همان را
 * می‌نویسد (فقط وقتی کلید وجود ندارد؛ ویرایش ادمین حفظ می‌شود).
 */

export const BUSINESS_KEYS = {
  pickupHours: "business.pickupHours",
  pickupAddress: "business.pickupAddress",
  phone: "business.phone",
  whatsapp: "business.whatsapp",
  serviceDefaultTerms: "service.defaultTerms",
  serviceConsentLabel: "service.checkoutConsentLabel",
  showPricePerKg: "catalog.showPricePerKg",
  /** ساعت شروع/پایان کاری (۰ تا ۲۴، وقت تهران) برای روش‌های «فقط ساعات کاری» */
  openHour: "business.openHour",
  closeHour: "business.closeHour",
  /** جمله‌ی بالای جدول قیمت خدمت (SEO.md §۳.۴) */
  priceIncludesNote: "catalog.priceIncludesNote",
  /** همان برای کالا (خرید کپسول، پیک‌نیک) */
  priceIncludesNoteProducts: "catalog.priceIncludesNoteProducts",
  /** توضیح زیر انتخاب آدرس در تسویه */
  shippingAreaNote: "shipping.areaNote",
} as const;

export interface BusinessSettings {
  /** مثل «۹ صبح تا ۶ عصر» */
  pickupHours: string;
  /** نشانی محل تحویل حضوری (`{{تکمیل…}}` تا کارفرما پر کند) */
  pickupAddress: string;
  /** شماره‌ی تماس (لینک `tel:`) */
  phone: string;
  /** لینک/شماره‌ی واتساپ؛ خالی ⇒ دکمه‌ی واتساپ نمایش داده نمی‌شود */
  whatsapp: string;
  /** متن پیش‌فرض شرایط شارژ و تعویض (قالب `lib/rich-text.ts`) */
  serviceDefaultTerms: string;
  serviceConsentLabel: string;
  /** نمایش «قیمت هر کیلو»؛ برای الو کپسول خاموش */
  showPricePerKg: boolean;
  openHour: number;
  closeHour: number;
  priceIncludesNote: string;
  priceIncludesNoteProducts: string;
  shippingAreaNote: string;
}

/**
 * پیش‌نویس شرایط شارژ (FORK.md §۶.۲) — **باید کارفرما بازبینی کند**.
 */
export const DEFAULT_SERVICE_TERMS = [
  "در خدمت شارژ، کپسول خالی شما با یک کپسول **از قبل پرشده و آماده‌ی مصرف** هم‌اندازه و هم‌نوع تعویض می‌شود. یعنی کپسولی که تحویل می‌گیرید، همان کپسول خودتان نیست.",
  `هنگام تحویل، کپسول خالی خود را به مأمور ارسال یا در محل تحویل حضوری به ما بدهید. ${todo("شرایط پذیرش کپسول خالی — مثلاً سالم بودن بدنه و شیر، تاریخ آزمایش، و آنچه در صورت عدم پذیرش اتفاق می‌افتد")}`,
].join("\n\n");

export const BUSINESS_SETTING_DEFAULTS: Record<
  (typeof BUSINESS_KEYS)[keyof typeof BUSINESS_KEYS],
  string | boolean | number
> = {
  [BUSINESS_KEYS.pickupHours]: "۹ صبح تا ۶ عصر",
  [BUSINESS_KEYS.pickupAddress]: todo("آدرس محل تحویل حضوری"),
  [BUSINESS_KEYS.phone]: "09126270595",
  [BUSINESS_KEYS.whatsapp]: "",
  [BUSINESS_KEYS.serviceDefaultTerms]: DEFAULT_SERVICE_TERMS,
  [BUSINESS_KEYS.serviceConsentLabel]:
    "شرایط تعویض کپسول را خوانده‌ام و می‌پذیرم",
  [BUSINESS_KEYS.showPricePerKg]: false,
  [BUSINESS_KEYS.openHour]: 9,
  [BUSINESS_KEYS.closeHour]: 18,
  [BUSINESS_KEYS.priceIncludesNote]:
    "قیمت‌ها فقط شامل هزینه‌ی شارژ است. هزینه‌ی ارسال جداگانه و بر اساس روش ارسال (عادی یا فوری) در مرحله‌ی تسویه محاسبه می‌شود.",
  [BUSINESS_KEYS.priceIncludesNoteProducts]:
    "هزینه‌ی ارسال جداگانه و بر اساس روش ارسال (عادی یا فوری) در مرحله‌ی تسویه محاسبه می‌شود.",
  [BUSINESS_KEYS.shippingAreaNote]:
    "ارسال فقط در محدوده‌ی شهر تهران انجام می‌شود.",
};

/** ساعت صحیح ۰ تا ۲۴؛ غیر از آن ⇒ پیش‌فرض */
function hour(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 24
    ? value
    : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/** رشته‌ی خالی برای متن‌های الزامی (مثل ساعت، برچسب) ⇒ پیش‌فرض */
function requiredText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseBusinessSettings(
  raw: Map<string, unknown>,
): BusinessSettings {
  const d = BUSINESS_SETTING_DEFAULTS;
  const get = (key: keyof typeof d) => raw.get(key);
  const flag = get(BUSINESS_KEYS.showPricePerKg);
  let openHour = hour(
    get(BUSINESS_KEYS.openHour),
    d[BUSINESS_KEYS.openHour] as number,
  );
  let closeHour = hour(
    get(BUSINESS_KEYS.closeHour),
    d[BUSINESS_KEYS.closeHour] as number,
  );
  // بازه‌ی وارونه/خالی ⇒ پیش‌فرض (روش «فقط ساعات کاری» هرگز برای همیشه بسته نشود)
  if (openHour >= closeHour) {
    openHour = d[BUSINESS_KEYS.openHour] as number;
    closeHour = d[BUSINESS_KEYS.closeHour] as number;
  }
  return {
    pickupHours: requiredText(
      get(BUSINESS_KEYS.pickupHours),
      d[BUSINESS_KEYS.pickupHours] as string,
    ),
    pickupAddress: requiredText(
      get(BUSINESS_KEYS.pickupAddress),
      d[BUSINESS_KEYS.pickupAddress] as string,
    ),
    phone: requiredText(
      get(BUSINESS_KEYS.phone),
      d[BUSINESS_KEYS.phone] as string,
    ),
    whatsapp: text(get(BUSINESS_KEYS.whatsapp), "").trim(),
    serviceDefaultTerms: requiredText(
      get(BUSINESS_KEYS.serviceDefaultTerms),
      d[BUSINESS_KEYS.serviceDefaultTerms] as string,
    ),
    serviceConsentLabel: requiredText(
      get(BUSINESS_KEYS.serviceConsentLabel),
      d[BUSINESS_KEYS.serviceConsentLabel] as string,
    ),
    showPricePerKg:
      typeof flag === "boolean"
        ? flag
        : (d[BUSINESS_KEYS.showPricePerKg] as boolean),
    openHour,
    closeHour,
    priceIncludesNote: requiredText(
      get(BUSINESS_KEYS.priceIncludesNote),
      d[BUSINESS_KEYS.priceIncludesNote] as string,
    ),
    priceIncludesNoteProducts: requiredText(
      get(BUSINESS_KEYS.priceIncludesNoteProducts),
      d[BUSINESS_KEYS.priceIncludesNoteProducts] as string,
    ),
    shippingAreaNote: requiredText(
      get(BUSINESS_KEYS.shippingAreaNote),
      d[BUSINESS_KEYS.shippingAreaNote] as string,
    ),
  };
}

export function defaultBusinessSettings(): BusinessSettings {
  return parseBusinessSettings(new Map());
}
