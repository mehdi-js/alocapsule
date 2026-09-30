import { z } from "zod";

import { parseEnamadCode } from "@/lib/enamad";
import { SERVICE_AREAS } from "@/lib/service-area";
import { toLatinDigits, toPersianDigits } from "@/lib/utils";

/** اعتبارسنجی فرم‌های تنظیمات ادمین (فاز ۱۳) */

const MAX_TOMAN = 100_000_000;

const trimmed = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} حداقل ${toPersianDigits(min)} کاراکتر باشد`)
    .max(max, `${label} حداکثر ${toPersianDigits(max)} کاراکتر باشد`);

const digitsOnly = (value: string) =>
  toLatinDigits(value).replace(/[\s-]/g, "");

/** الگوریتم Luhn (شماره کارت‌های شتاب هم از آن پیروی می‌کنند) */
export function isValidCardNumber(value: string): boolean {
  if (!/^\d{16}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let digit = Number(value[15 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** شبا: IR + ۲۴ رقم، با کنترل mod 97 استاندارد IBAN */
export function isValidSheba(value: string): boolean {
  if (!/^IR\d{24}$/.test(value)) return false;
  const rearranged = `${value.slice(4)}1827${value.slice(2, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }
  return remainder === 1;
}

export const bankCardSchema = z.object({
  bankName: trimmed("نام بانک", 2, 60),
  cardNumber: z
    .string()
    .transform(digitsOnly)
    .refine(isValidCardNumber, "شماره کارت ۱۶ رقمی معتبر نیست"),
  shebaNumber: z
    .string()
    .transform((value) => digitsOnly(value).toUpperCase())
    .transform((value) =>
      value && !value.startsWith("IR") ? `IR${value}` : value,
    )
    .refine(
      (value) => value === "" || isValidSheba(value),
      "شماره شبا معتبر نیست",
    )
    .transform((value) => value || null),
  accountHolderName: trimmed("نام صاحب حساب", 2, 80),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});
export type BankCardInput = z.output<typeof bankCardSchema>;
export type BankCardFormInput = z.input<typeof bankCardSchema>;

const PROVINCES = SERVICE_AREAS.map((area) => area.province);

export const shippingMethodSchema = z
  .object({
    name: trimmed("نام روش ارسال", 2, 60),
    description: z
      .string()
      .trim()
      .max(200, "توضیح حداکثر ۲۰۰ کاراکتر باشد")
      .transform((value) => value || null),
    cost: z
      .number({ error: "هزینه باید عدد صحیح باشد" })
      .int("هزینه باید عدد صحیح باشد")
      .min(0, "هزینه نمی‌تواند منفی باشد")
      .max(MAX_TOMAN, "هزینه بیش از حد است"),
    freeAboveAmount: z
      .number({ error: "آستانه باید عدد صحیح باشد" })
      .int()
      .min(1, "آستانه باید مثبت باشد")
      .max(MAX_TOMAN * 10)
      .nullable(),
    provinces: z
      .array(z.string())
      .refine(
        (list) => list.every((province) => PROVINCES.includes(province)),
        "استان خارج از منطقه‌ی تحت پوشش است",
      ),
    /** هزینه‌ی پیک درب منزل به پیک پرداخت می‌شود ⇒ هزینه و آستانه در سایت صفر */
    payOnDelivery: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .transform((method) =>
    method.payOnDelivery
      ? { ...method, cost: 0, freeAboveAmount: null }
      : method,
  );
export type ShippingMethodInput = z.output<typeof shippingMethodSchema>;
export type ShippingMethodFormInput = z.input<typeof shippingMethodSchema>;

const socialUrl = z
  .string()
  .trim()
  .max(200)
  .refine(
    (value) => value === "" || /^https:\/\/[^\s]+$/i.test(value),
    "آدرس باید با https:// شروع شود (خالی = نمایش داده نمی‌شود)",
  );

export const generalSettingsSchema = z.object({
  maxQuantityPerItem: z
    .number({ error: "سقف تعداد باید عدد صحیح باشد" })
    .int("سقف تعداد باید عدد صحیح باشد")
    .min(1, "سقف تعداد حداقل ۱ است")
    .max(999, "سقف تعداد حداکثر ۹۹۹ است"),
  contact: z.object({
    phone: trimmed("تلفن", 5, 30),
    email: z.email("ایمیل معتبر نیست").max(120),
    address: trimmed("نشانی", 5, 200),
  }),
  social: z.object({
    instagram: socialUrl,
    telegram: socialUrl,
    whatsapp: socialUrl,
  }),
  trustItems: z
    .array(
      z.object({
        title: trimmed("عنوان", 2, 30),
        subtitle: trimmed("زیرعنوان", 2, 40),
      }),
    )
    .length(3),
  aboutStats: z
    .array(
      z.object({
        value: trimmed("عدد", 1, 10),
        label: trimmed("برچسب", 2, 30),
      }),
    )
    .length(4),
  shippingNote: trimmed("متن ارسال و نگهداری", 10, 600),
  /** کد دریافتی از اینماد (یا آدرسش)؛ خالی ⇒ بدون نماد */
  enamad: z
    .string()
    .max(2000, "کد اینماد بیش از حد طولانی است")
    .transform((value, ctx) => {
      if (value.trim() === "") return null;
      const seal = parseEnamadCode(value);
      if (!seal) {
        ctx.addIssue({
          code: "custom",
          message:
            "کد اینماد شناخته نشد؛ کد کامل را از پنل اینماد کپی کنید (شامل trustseal.enamad.ir، id و Code).",
        });
        return z.NEVER;
      }
      return seal;
    }),
});
export type GeneralSettingsInput = z.output<typeof generalSettingsSchema>;
export type GeneralSettingsFormInput = z.input<typeof generalSettingsSchema>;

/** حالت بروزرسانی سایت؛ پیام خالی ⇒ پیام پیش‌فرض */
export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(300, "پیام حداکثر ۳۰۰ کاراکتر باشد"),
});

export type MaintenanceInput = z.output<typeof maintenanceSchema>;
