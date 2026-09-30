import { z } from "zod";

import { OTP_LENGTH } from "@/lib/otp-config";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-config";
import { normalizePhone } from "@/lib/phone";
import { toLatinDigits, toPersianDigits } from "@/lib/utils";

const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: "شماره‌ی موبایل نامعتبر است" });
    return z.NEVER;
  }
  return phone;
});

const otpCodeSchema = z
  .string()
  .transform((value) => toLatinDigits(value).replace(/\s/g, ""))
  .pipe(
    z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), {
      message: `کد تأیید باید ${OTP_LENGTH} رقم باشد`,
    }),
  );

export const requestOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

export type RequestOtpInput = z.input<typeof requestOtpSchema>;
export type VerifyOtpInput = z.input<typeof verifyOtpSchema>;

// ───────── رمز عبور ─────────

/**
 * ارقام فارسی/عربی به لاتین تبدیل می‌شوند تا رمزی که با صفحه‌کلید فارسی
 * تایپ شده با انگلیسی هم پذیرفته شود.
 */
export function normalizePassword(value: string): string {
  return toLatinDigits(value).normalize("NFC");
}

const rawPassword = z
  .string()
  .max(PASSWORD_MAX_LENGTH, "رمز عبور بیش از حد طولانی است")
  .transform(normalizePassword);

/** قانون رمز جدید: حداقل ۸ کاراکتر، دست‌کم یک حرف و یک عدد */
export const newPasswordSchema = rawPassword.pipe(
  z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `رمز عبور حداقل ${toPersianDigits(PASSWORD_MIN_LENGTH)} کاراکتر باشد`,
    )
    .regex(/\p{L}/u, "رمز عبور باید دست‌کم یک حرف داشته باشد")
    .regex(/\d/, "رمز عبور باید دست‌کم یک عدد داشته باشد"),
);

export const passwordLoginSchema = z.object({
  phone: phoneSchema,
  password: rawPassword.pipe(z.string().min(1, "رمز عبور را وارد کنید")),
});

export const setPasswordSchema = z
  .object({
    /** فقط وقتی لازم است که کاربر رمز دارد و تازه با پیامک وارد نشده */
    currentPassword: rawPassword.optional(),
    password: newPasswordSchema,
    confirmPassword: rawPassword,
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "تکرار رمز عبور با خود رمز یکسان نیست",
  });

export type PasswordLoginInput = z.input<typeof passwordLoginSchema>;
export type SetPasswordInput = z.input<typeof setPasswordSchema>;
