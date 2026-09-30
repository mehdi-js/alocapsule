import type { Instrumentation } from "next";

/**
 * خطاهای مهارنشده‌ی سرور (صفحه، Route Handler، Server Action) به‌صورت
 * لاگ ساختاریافته ثبت می‌شوند. آدرس بدون query string ثبت می‌شود تا
 * پارامترهای احتمالاً حساس در لاگ نروند.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { logger } = await import("@/lib/logger");
  logger.error("request_failed", error, {
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
    digest:
      error && typeof error === "object" && "digest" in error
        ? String((error as { digest?: unknown }).digest)
        : undefined,
  });
};
