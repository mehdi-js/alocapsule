/**
 * حالت بروزرسانی (maintenance): همه به‌جز ادمینِ واردشده صفحه‌ی «در حال
 * بروزرسانی» را می‌بینند. خالص؛ middleware و پنل ادمین هر دو از آن استفاده
 * می‌کنند.
 */

export const MAINTENANCE_KEY = "site.maintenance";
export const MAINTENANCE_PATH = "/maintenance";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "در حال بروزرسانی سایت هستیم و به‌زودی برمی‌گردیم. از شکیبایی شما سپاسگزاریم.";

/** کوکی غیرمحرمانه‌ای که به مرورگر ادمین می‌گوید نوار «حالت بروزرسانی فعال است» را نشان دهد */
export const MAINTENANCE_PREVIEW_COOKIE = "alihan_maintenance_preview";

export interface MaintenanceState {
  enabled: boolean;
  message: string;
}

/**
 * مسیرهایی که در حالت بروزرسانی هم باز می‌مانند: منوی شعبه‌ها (QR)، ورود و
 * تعیین رمز (تا ادمین وارد شود)، پنل ادمین (خودش ادمین را می‌خواهد)، API
 * (هر مسیر خودش احراز هویت دارد؛ تصاویر منو هم از آن می‌آیند) و فایل‌های ثابت.
 */
const EXEMPT_PREFIXES = [
  "/menu",
  "/login",
  "/set-password",
  "/admin",
  "/api",
  "/_next",
  "/fonts",
  "/uploads",
  MAINTENANCE_PATH,
];
const EXEMPT_FILES = [
  "/icon.svg",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export function isMaintenanceExempt(pathname: string): boolean {
  if (EXEMPT_FILES.includes(pathname)) return true;
  return EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function parseMaintenance(value: unknown): MaintenanceState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE };
  }
  const record = value as Record<string, unknown>;
  const message =
    typeof record.message === "string" && record.message.trim()
      ? record.message.trim()
      : DEFAULT_MAINTENANCE_MESSAGE;
  return { enabled: record.enabled === true, message };
}
