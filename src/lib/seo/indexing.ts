/**
 * کنترل ایندکس با متغیر محیطی (SEO.md §۸.۳): فقط `ALLOW_INDEXING=true` روی
 * production واقعی. هر مقدار دیگر (یا نبودنش) ⇒ robots.txt کامل بسته و همه‌ی
 * صفحات `noindex, nofollow` تا سرور تست یا نسخه‌ی نیمه‌کاره ایندکس نشود.
 */
export function isIndexingAllowed(): boolean {
  return process.env.ALLOW_INDEXING === "true";
}
