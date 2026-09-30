/**
 * مسیر بازگشت بعد از ورود را فقط وقتی می‌پذیرد که مسیر داخلی باشد
 * (جلوگیری از open redirect مثل `//evil.com` یا `https://evil.com`).
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  // بک‌اسلش و فاصله/خط جدید توسط برخی مرورگرها به `/` یا حذف تعبیر می‌شوند.
  if (/[\\\s]/.test(value)) return fallback;
  return value;
}
