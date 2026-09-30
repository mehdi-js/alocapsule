import { z } from "zod";

import { MAX_WALLET_ADJUSTMENT } from "@/lib/wallet";

const fullNameSchema = z
  .string()
  .trim()
  .max(80, "نام حداکثر ۸۰ کاراکتر باشد")
  .refine((value) => value === "" || value.length >= 2, {
    message: "نام حداقل ۲ کاراکتر باشد",
  })
  .transform((value) => value || null);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "ایمیل حداکثر ۱۲۰ کاراکتر باشد")
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "ایمیل معتبر نیست",
  })
  .transform((value) => value || null);

/** پروفایل کاربر: فقط نام و ایمیل (موبایل شناسه‌ی ورود است و تغییر نمی‌کند) */
export const profileInputSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
});

export type ProfileInput = z.output<typeof profileInputSchema>;
export type ProfileFormInput = z.input<typeof profileInputSchema>;

/** ویرایش کاربر توسط ادمین */
export const adminUserInputSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  role: z.enum(["CUSTOMER", "ADMIN"], { error: "نقش نامعتبر است" }),
  isActive: z.boolean(),
});

export type AdminUserInput = z.output<typeof adminUserInputSchema>;
export type AdminUserFormInput = z.input<typeof adminUserInputSchema>;

/** شارژ/کسر دستی کیف پول (بند ۷.۴: یادداشت اجباری) */
export const walletAdjustmentSchema = z.object({
  type: z.enum(["CREDIT", "DEBIT"], { error: "نوع تغییر را انتخاب کنید" }),
  amount: z
    .number({ error: "مبلغ باید عدد صحیح باشد" })
    .int("مبلغ باید عدد صحیح باشد")
    .min(1, "مبلغ باید حداقل ۱ تومان باشد")
    .max(MAX_WALLET_ADJUSTMENT, "مبلغ بیش از حد مجاز است"),
  note: z
    .string()
    .trim()
    .min(3, "یادداشت (دلیل تغییر) را بنویسید")
    .max(300, "یادداشت حداکثر ۳۰۰ کاراکتر باشد"),
  /** شناسه‌ی یکتای فرم تا کلیک دوباره دو تراکنش نسازد */
  requestId: z.uuid(),
});

export type WalletAdjustmentInput = z.output<typeof walletAdjustmentSchema>;
