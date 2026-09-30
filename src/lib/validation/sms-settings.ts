import { z } from "zod";

import {
  ALLOWED_VARIABLES,
  MAX_VARIABLES,
  SMS_TYPES,
  type SmsType,
  templateError,
  VARIABLE_KEYS,
  VARIABLES,
} from "@/lib/notification-templates";
import { normalizePhone } from "@/lib/phone";
import { toLatinDigits, toPersianDigits } from "@/lib/utils";

const patternSchema = z
  .string()
  .transform((value) => toLatinDigits(value).trim())
  .pipe(
    z
      .string()
      .regex(/^\d{0,20}$/, "شناسه‌ی الگو فقط عدد است (خالی = مقدار .env)"),
  );

const templateSchema = z
  .string()
  .trim()
  .min(10, "متن پیامک حداقل ۱۰ کاراکتر باشد")
  .max(500, "متن پیامک حداکثر ۵۰۰ کاراکتر باشد");

const variablesSchema = z
  .array(z.enum(VARIABLE_KEYS))
  .max(
    MAX_VARIABLES,
    `حداکثر ${toPersianDigits(MAX_VARIABLES)} متغیر برای هر پیامک`,
  );

function byType<T extends z.ZodType>(schema: T) {
  return z.object(
    Object.fromEntries(SMS_TYPES.map((type) => [type, schema])) as Record<
      SmsType,
      T
    >,
  );
}

/** شماره‌ی مدیر: خالی (از .env / بدون پیامک مدیر) یا موبایل معتبر */
const adminPhoneSchema = z
  .string()
  .refine(
    (value) => value.trim() === "" || normalizePhone(value) !== null,
    "شماره‌ی موبایل نامعتبر است",
  )
  .transform((value) => (value.trim() === "" ? "" : normalizePhone(value)!));

export const smsSettingsSchema = z
  .object({
    templates: byType(templateSchema),
    variables: byType(variablesSchema),
    patterns: byType(patternSchema),
    adminPhone: adminPhoneSchema,
  })
  .superRefine((input, ctx) => {
    for (const type of SMS_TYPES) {
      const order = input.variables[type];
      const allowed = ALLOWED_VARIABLES[type];
      const bad = order.find((key) => !allowed.includes(key));
      if (bad) {
        ctx.addIssue({
          code: "custom",
          path: ["variables", type],
          message: `«${VARIABLES[bad].label}» برای این پیامک در دسترس نیست.`,
        });
        continue;
      }
      if (type === "OTP" && !order.includes("code")) {
        ctx.addIssue({
          code: "custom",
          path: ["variables", type],
          message: "پیامک کد ورود باید متغیر «کد ورود» را داشته باشد.",
        });
      }
      const error = templateError(input.templates[type], order.length);
      if (error) {
        ctx.addIssue({
          code: "custom",
          path: ["templates", type],
          message: error,
        });
      }
    }
  });

export type SmsSettingsInput = z.output<typeof smsSettingsSchema>;
export type SmsSettingsFormInput = z.input<typeof smsSettingsSchema>;

/** اتصال پیامک از پنل؛ رمز خالی ⇒ رمز قبلی می‌ماند */
export const smsConnectionSchema = z.object({
  provider: z.enum(["", "melipayamak", "console"]),
  username: z.string().trim().max(100, "نام کاربری بیش از حد طولانی است"),
  newPassword: z.string().trim().max(200, "رمز/ApiKey بیش از حد طولانی است"),
  clearPassword: z.boolean(),
});

export type SmsConnectionInput = z.output<typeof smsConnectionSchema>;
