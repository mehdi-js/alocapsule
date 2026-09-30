import { timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MIN_SECRET_LENGTH = 32;

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * بازسازی کش صفحات (ISR). پس از هر استقرار صدا زده می‌شود، چون build داخل
 * Docker بدون دیتابیس انجام می‌شود (`BUILD_WITHOUT_DB`). فقط با هدر
 * `x-revalidate-secret` برابر `REVALIDATE_SECRET`؛ بدون تنظیم ⇒ ۴۰۴.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    return new Response("Not found", { status: 404 });
  }
  if (!secretMatches(request.headers.get("x-revalidate-secret"), secret)) {
    return new Response("Forbidden", { status: 403 });
  }
  revalidatePath("/", "layout");
  logger.info("cache_revalidated");
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
