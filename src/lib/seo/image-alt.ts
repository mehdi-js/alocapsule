import { toPersianDigits } from "@/lib/utils";

/**
 * alt پیش‌فرض تصویر محصول (SEO.md §۶.۲): `{نام محصول} {برند}` و برای
 * تصاویر بعدی شماره‌ی تصویر. ادمین در فرم تصاویر (فاز S2) توصیفی‌اش می‌کند.
 */
export function defaultImageAlt(
  productName: string,
  brandName: string,
  position: number,
): string {
  const base = `${productName.trim()} ${brandName.trim()}`.trim();
  return position <= 0 ? base : `${base} ${toPersianDigits(position + 1)}`;
}
