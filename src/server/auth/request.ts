/**
 * IP کلاینت از هدرهای reverse proxy. فقط پشت پروکسی مطمئن (که این هدر را
 * خودش بازنویسی می‌کند) قابل اتکاست؛ در غیر این صورت کلاینت می‌تواند جعلش کند.
 * اگر IP مشخص نباشد `null` برمی‌گردد و rate limit مبتنی بر IP رد می‌شود.
 */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}
