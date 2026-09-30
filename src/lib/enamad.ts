/**
 * نماد اعتماد الکترونیکی (اینماد). کد HTML دریافتی از اینماد مستقیم در صفحه
 * درج نمی‌شود (خطر XSS)؛ فقط `id` و `Code` از آن استخراج و نشان استاندارد با
 * همان آدرس‌های رسمی ساخته می‌شود.
 */

export interface EnamadSeal {
  id: string;
  code: string;
}

export const ENAMAD_HOST = "https://trustseal.enamad.ir";

/**
 * کد کامل (`<a …><img …></a>`) یا آدرس صفحه/تصویر اینماد ⇒ `{id, code}`.
 * خالی یا ناشناخته ⇒ `null`.
 */
export function parseEnamadCode(input: string): EnamadSeal | null {
  const text = input.replace(/&amp;/g, "&");
  if (!/trustseal\.enamad\.ir/i.test(text)) return null;
  const id = /[?&]id=(\d{1,12})\b/i.exec(text)?.[1];
  const code = /[?&]Code=([A-Za-z0-9]{4,40})\b/.exec(text)?.[1];
  return id && code ? { id, code } : null;
}

export function enamadUrls(seal: EnamadSeal): { page: string; logo: string } {
  const query = `id=${encodeURIComponent(seal.id)}&Code=${encodeURIComponent(seal.code)}`;
  return {
    page: `${ENAMAD_HOST}/?${query}`,
    logo: `${ENAMAD_HOST}/logo.aspx?${query}`,
  };
}

/** کد استاندارد اینماد از روی `{id, code}` (برای نمایش در فرم پنل) */
export function enamadSnippet(seal: EnamadSeal): string {
  const { page, logo } = enamadUrls(seal);
  return `<a referrerpolicy='origin' target='_blank' href='${page}'><img referrerpolicy='origin' src='${logo}' alt='' style='cursor:pointer' code='${seal.code}'></a>`;
}
