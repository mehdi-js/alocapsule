import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { getAuthSecret } from "@/lib/env";
import { OTP_LENGTH } from "@/lib/otp-config";

/** کد ۶ رقمی با منبع تصادفی امن (رقم‌های ابتدایی می‌توانند صفر باشند). */
export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/**
 * hash کد با HMAC و `AUTH_SECRET`. فضای کد ۶ رقمی کوچک است و SHA-256 ساده
 * با نشت دیتابیس فوراً شکسته می‌شود؛ secret و شماره، آن را بی‌اثر می‌کند.
 */
export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(`${phone}:${code}`)
    .digest("hex");
}

export function verifyOtpHash(
  phone: string,
  code: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashOtp(phone, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** hash توکن نشست (JWT) برای ذخیره در دیتابیس */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
