import { type NextRequest, NextResponse } from "next/server";

import {
  isMaintenanceExempt,
  MAINTENANCE_PATH,
  MAINTENANCE_PREVIEW_COOKIE,
} from "@/lib/maintenance";
import { SESSION_COOKIE_NAME } from "@/server/auth/cookie";
import { type SessionClaims, verifySessionJwt } from "@/server/auth/jwt";
import { getMaintenanceCached } from "@/server/services/maintenance.service";
import { matchRedirect } from "@/server/services/redirect.service";

/**
 * ۰) ریدایرکت‌ها (SEO.md §۱۱): جدول ریدایرکت (کش در حافظه) و قواعد الگویی
 *    وردپرس ⇒ 301 مستقیم به مقصد نهایی، یا 410 برای مسیرهای حذف‌شده.
 * ۱) حالت بروزرسانی: هر صفحه (به‌جز مسیرهای معاف، مثل منوی شعبه‌ها و ورود)
 *    برای غیرادمین صفحه‌ی «در حال بروزرسانی» با وضعیت 503 است.
 * ۲) لایه‌ی اول محافظت `/admin`، `/account`، `/checkout`: فقط امضا و انقضای
 *    JWT (بدون دیتابیس). ابطال نشست و نقش واقعی در `getCurrentUser()` /
 *    `requireAdmin()` چک می‌شود؛ هر Server Action هم مستقلاً نقش را می‌سنجد.
 */

const PROTECTED_PREFIXES = ["/admin", "/account", "/checkout"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** مسیرهای خود اپلیکیشن که هرگز ریدایرکت قدیمی ندارند */
const REDIRECT_SKIP_PREFIXES = ["/_next/", "/api/", "/admin"];

function shouldCheckRedirect(request: NextRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname } = request.nextUrl;
  return !REDIRECT_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** پاسخ 410 (Gone): page component نمی‌تواند 410 بدهد، پس همین‌جا */
function goneResponse(): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="fa-IR" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>این صفحه حذف شده است</title></head><body style="font-family:Tahoma,sans-serif;background:#fafaf9;color:#1c1917;display:grid;place-items:center;min-height:100vh;margin:0"><main style="text-align:center;padding:24px"><h1>این صفحه برای همیشه حذف شده است</h1><p><a href="/" style="color:#c2410c">بازگشت به صفحه‌ی اصلی</a></p></main></body></html>`,
    {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

async function readClaims(request: NextRequest): Promise<SessionClaims | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySessionJwt(token) : null;
}

/** نوار «حالت بروزرسانی فعال است» فقط در مرورگر ادمین */
function syncPreviewCookie(
  request: NextRequest,
  response: NextResponse,
  show: boolean,
): NextResponse {
  const has = request.cookies.has(MAINTENANCE_PREVIEW_COOKIE);
  if (show && !has) {
    response.cookies.set(MAINTENANCE_PREVIEW_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
    });
  } else if (!show && has) {
    response.cookies.delete(MAINTENANCE_PREVIEW_COOKIE);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (shouldCheckRedirect(request)) {
    const match = await matchRedirect(
      pathname,
      search,
      request.headers.get("referer"),
    );
    if (match?.kind === "gone") return goneResponse();
    if (match?.kind === "redirect") {
      return NextResponse.redirect(new URL(match.to, request.url), 301);
    }
  }

  // trailingSlash: false (SEO.md §۴.۲): /x/ ⇒ /x با 308 (بعد از ریدایرکت‌ها)
  if (pathname.length > 1 && pathname.endsWith("/")) {
    // URL ساده (نه NextURL که اسلش انتهایی را دوباره اضافه می‌کند)
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  const maintenance = isMaintenanceExempt(pathname)
    ? null
    : await getMaintenanceCached();

  let claims: SessionClaims | null | undefined;
  const getClaims = async () => (claims ??= await readClaims(request));

  if (maintenance?.enabled && (await getClaims())?.role !== "ADMIN") {
    const closed = NextResponse.rewrite(
      new URL(MAINTENANCE_PATH, request.url),
      {
        status: 503,
        headers: { "Retry-After": "3600", "Cache-Control": "no-store" },
      },
    );
    // ادمینی که خارج شده دیگر نوار «فقط شما می‌بینید» را نبیند
    return syncPreviewCookie(request, closed, false);
  }

  if (isProtected(pathname)) {
    const session = await getClaims();
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();
  // فقط روی صفحات عادی (نه مسیرهای معاف) کوکی نوار به‌روز می‌شود
  return maintenance
    ? syncPreviewCookie(request, response, maintenance.enabled)
    : response;
}

export const config = {
  // همه‌ی مسیرها به‌جز فایل‌های ساخته‌شده‌ی Next (سبک: مسیرهای معاف دیتابیس نمی‌خوانند)
  matcher: ["/((?!_next/static|_next/image).*)"],
  // Node runtime (نه Edge): طبق سند نباید به Edge Runtime وابسته باشیم.
  runtime: "nodejs",
};
