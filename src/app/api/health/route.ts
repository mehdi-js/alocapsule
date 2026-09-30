import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 3_000;

/**
 * سلامت سرویس برای healthcheck داکر و مانیتورینگ: ۲۰۰ اگر دیتابیس پاسخ
 * بدهد، وگرنه ۵۰۳. هیچ اطلاعات حساسی (نسخه، رشته‌ی اتصال) برنمی‌گرداند.
 */
export async function GET() {
  let database: "ok" | "down" = "ok";
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db timeout")), DB_TIMEOUT_MS),
      ),
    ]);
  } catch (error) {
    database = "down";
    logger.error("health_db_failed", error);
  }
  const ok = database === "ok";
  return Response.json(
    { status: ok ? "ok" : "error", database, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
