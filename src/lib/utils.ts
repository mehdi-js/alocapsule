const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** ترکیب شرطی نام کلاس‌ها؛ مقادیر falsy نادیده گرفته می‌شوند. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** تبدیل ارقام لاتین به فارسی (فقط برای نمایش در UI). */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/** تبدیل ارقام فارسی و عربی به لاتین (قبل از ذخیره یا اعتبارسنجی). */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/**
 * تبدیل ورودی متنی فرم به عدد صحیح: ارقام فارسی/عربی و جداکننده‌های هزارگان
 * (`,` `٬` `،`) و فاصله پذیرفته می‌شوند. مقدار خالی یا نامعتبر ⇒ `null`.
 */
export function parseIntegerInput(value: string): number | null {
  const cleaned = toLatinDigits(value).replace(/[\s,٬،]/g, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/** رمزگشایی امن پارامتر مسیر (slug فارسی ممکن است percent-encoded برسد) */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** JSON برای `<script type="application/ld+json">` بدون امکان شکستن تگ */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
