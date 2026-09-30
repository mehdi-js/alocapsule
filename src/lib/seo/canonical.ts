/**
 * canonical صفحات فهرست (SEO.md §۴.۲):
 * - مرتب‌سازی، فیلتر و پارامترهای ناشناخته (utm_*، fbclid) ⇒ آدرس تمیز
 * - صفحه‌بندی بدون فیلتر ⇒ خودش (`?page=2`)؛ صفحه‌ی ۱ هرگز `?page=1` ندارد
 */
export function listingCanonicalPath(
  basePath: string,
  params: { page: number; filtered: boolean },
): string {
  if (params.filtered || params.page <= 1) return basePath;
  return `${basePath}?page=${params.page}`;
}

/** آدرس مطلق از مسیر نسبی؛ آدرس کامل دست‌نخورده می‌ماند */
export function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  return new URL(pathOrUrl, siteUrl).toString();
}
