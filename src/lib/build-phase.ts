/**
 * `next build` بدون دیتابیس (داخل Docker، `BUILD_WITHOUT_DB=1`): صفحاتی که
 * هنگام build پیش‌رندر می‌شوند (صفحه‌ی اصلی، sitemap، لایه‌ی فروشگاه) داده‌ی
 * خالی/پیش‌فرض می‌گیرند و پس از راه‌اندازی با `/api/revalidate` تازه می‌شوند.
 */
export function isBuildWithoutDb(): boolean {
  return (
    process.env.BUILD_WITHOUT_DB === "1" &&
    process.env.NEXT_PHASE === "phase-production-build"
  );
}
