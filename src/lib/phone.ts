import { toLatinDigits } from "@/lib/utils";

const MOBILE_PATTERN = /^09\d{9}$/;

/**
 * نرمال‌سازی شماره‌ی موبایل ایران به فرمت `09XXXXXXXXX`.
 * ارقام فارسی/عربی به لاتین تبدیل می‌شوند و پیشوندهای `+98`، `0098`، `98`
 * و حالت بدون صفر (`9XXXXXXXXX`) پذیرفته می‌شوند.
 * اگر شماره معتبر نباشد `null` برمی‌گردد.
 */
export function normalizePhone(input: string): string | null {
  let value = toLatinDigits(input).replace(/[\s\-().\u200c\u200d]/g, "");

  if (value.startsWith("+98")) value = `0${value.slice(3)}`;
  else if (value.startsWith("0098")) value = `0${value.slice(4)}`;
  else if (value.startsWith("98") && value.length === 12)
    value = `0${value.slice(2)}`;
  else if (/^9\d{9}$/.test(value)) value = `0${value}`;

  return MOBILE_PATTERN.test(value) ? value : null;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}
