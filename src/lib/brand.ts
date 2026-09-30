/**
 * پایه‌ی برند: تنها جایی که نام برند و شناسه‌ی فنی نوشته می‌شود. بقیه‌ی کد از
 * `SITE` (`lib/site-content.ts`) یا کلید `seo.brandName` می‌خوانند.
 * هیچ import‌ای از ماژول‌های دیگر ندارد تا هر جایی بدون چرخه قابل استفاده باشد.
 */

export const BRAND_NAME = "الو کپسول";

/** شناسه‌ی فنی لاتین: نام کوکی‌ها، کلیدهای storage و … (هرگز در UI نمایش داده نمی‌شود) */
export const BRAND_SLUG = "alocapsule";

/** جای‌نگهدار داده‌ی کسب‌وکار؛ `seo:audit` (فاز S5) وجودش را در HTML گزارش می‌کند */
export const COMPLETION_MARKER = `{{تکمیل توسط ${BRAND_NAME}`;

export function todo(what?: string): string {
  return what ? `${COMPLETION_MARKER}: ${what}}}` : `${COMPLETION_MARKER}}}`;
}

export function hasCompletionMarker(text: string): boolean {
  return text.includes(COMPLETION_MARKER);
}
