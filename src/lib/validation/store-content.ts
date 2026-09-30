import { z } from "zod";

import { toLatinDigits, toPersianDigits } from "@/lib/utils";
import { MAX_SERVICE_TERMS_LENGTH } from "@/lib/validation/product";

/**
 * فرم‌های «کسب‌وکار و خدمت» و «صفحه‌ی اصلی» (FORK.md §۳.۶ و §۵.۳) که در
 * `Setting` ذخیره می‌شوند. متن‌ها همیشه trim می‌شوند.
 */

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} حداقل ${toPersianDigits(min)} کاراکتر باشد`)
    .max(max, `${label} حداکثر ${toPersianDigits(max)} کاراکتر باشد`);

/** شماره‌ی تماس: موبایل یا ثابت؛ ارقام فارسی/فاصله/خط تیره مجاز، ۸ تا ۱۳ رقم */
const phone = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\+?\d{8,13}$/.test(toLatinDigits(value).replace(/[\s()-]/g, "")),
    "شماره‌ی تماس معتبر نیست (مثل 09121234567 یا 02122334455)",
  )
  .transform((value) => toLatinDigits(value).replace(/[\s()-]/g, ""));

/** واتساپ: خالی، شماره، یا لینک https (مثل https://wa.me/98912…) */
const whatsapp = z
  .string()
  .trim()
  .max(200, "واتساپ حداکثر ۲۰۰ کاراکتر باشد")
  .refine(
    (value) =>
      value === "" ||
      /^https:\/\/[^\s]+$/i.test(value) ||
      /^\+?\d{8,13}$/.test(toLatinDigits(value).replace(/[\s-]/g, "")),
    "واتساپ: شماره یا آدرس https وارد کنید (خالی = دکمه نمایش داده نمی‌شود)",
  );

export const businessSettingsSchema = z
  .object({
    pickupHours: text("ساعت تحویل حضوری", 2, 80),
    pickupAddress: text("نشانی تحویل حضوری", 5, 400),
    phone,
    whatsapp,
    /** قالب متنی `lib/rich-text.ts` (HTML خام ذخیره نمی‌شود) */
    serviceDefaultTerms: text(
      "متن پیش‌فرض شرایط خدمت",
      20,
      MAX_SERVICE_TERMS_LENGTH,
    ),
    serviceConsentLabel: text("برچسب چک‌باکس شرایط", 5, 150),
    showPricePerKg: z.boolean(),
    openHour: z
      .number({ error: "ساعت شروع باید عدد صحیح باشد" })
      .int("ساعت شروع باید عدد صحیح باشد")
      .min(0, "ساعت شروع بین ۰ تا ۲۳ باشد")
      .max(23, "ساعت شروع بین ۰ تا ۲۳ باشد"),
    closeHour: z
      .number({ error: "ساعت پایان باید عدد صحیح باشد" })
      .int("ساعت پایان باید عدد صحیح باشد")
      .min(1, "ساعت پایان بین ۱ تا ۲۴ باشد")
      .max(24, "ساعت پایان بین ۱ تا ۲۴ باشد"),
    priceIncludesNote: text("جمله‌ی قیمت خدمت", 5, 300),
    priceIncludesNoteProducts: text("جمله‌ی قیمت کالا", 5, 300),
    shippingAreaNote: text("توضیح محدوده‌ی ارسال", 5, 200),
    /** ۱ تا ۸ حرف بزرگ لاتین/عدد، شروع با حرف (سفارش‌های قبلی با پیشوند قبلی می‌مانند) */
    orderNumberPrefix: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(
        (value) => /^[A-Z][A-Z0-9]{0,7}$/.test(value),
        "پیشوند باید ۱ تا ۸ حرف/عدد لاتین باشد و با حرف شروع شود (مثل AC)",
      ),
  })
  .refine((value) => value.openHour < value.closeHour, {
    path: ["closeHour"],
    message: "ساعت پایان باید بعد از ساعت شروع باشد",
  });

export type BusinessSettingsInput = z.output<typeof businessSettingsSchema>;
export type BusinessSettingsFormInput = z.input<typeof businessSettingsSchema>;

const textItem = z.object({
  title: text("عنوان", 2, 60),
  text: text("متن", 5, 240),
});

const statItem = z.object({
  label: text("برچسب", 2, 40),
  value: text("عدد", 1, 12),
});

export const homeSettingsSchema = z.object({
  heroTitle: text("تیتر هیرو", 3, 80),
  heroSubtitle: text("توضیح هیرو", 10, 240),
  heroPrimaryCta: text("متن دکمه‌ی اول", 2, 30),
  heroPrimaryHref: z
    .string()
    .trim()
    .max(200, "مقصد حداکثر ۲۰۰ کاراکتر باشد")
    .refine(
      (value) => /^\/(?!\/)\S*$/.test(value),
      "مقصد باید مسیر داخلی سایت باشد (مثل /category/lpg-charge)",
    ),
  heroSecondaryCta: text("متن دکمه‌ی تماس", 2, 30),
  stepsTitle: text("عنوان بخش مراحل", 3, 80),
  steps: z
    .array(textItem)
    .min(2, "حداقل ۲ مرحله لازم است")
    .max(6, "حداکثر ۶ مرحله مجاز است"),
  featuredTitle: text("عنوان محصولات منتخب", 3, 80),
  aboutTitle: text("عنوان درباره ما", 3, 80),
  aboutText: text("متن درباره ما", 10, 1000),
  customersTitle: text("عنوان مشتریان", 3, 80),
  customers: z
    .array(textItem)
    .min(1, "حداقل یک نوع مشتری لازم است")
    .max(6, "حداکثر ۶ مورد مجاز است"),
  /** خالی ⇒ کل بخش آمار در صفحه‌ی اصلی نمایش داده نمی‌شود */
  stats: z.array(statItem).max(6, "حداکثر ۶ آمار مجاز است"),
  ctaTitle: text("عنوان دعوت به تماس", 3, 80),
  ctaText: text("متن دعوت به تماس", 5, 240),
});

export type HomeSettingsInput = z.output<typeof homeSettingsSchema>;
export type HomeSettingsFormInput = z.input<typeof homeSettingsSchema>;
