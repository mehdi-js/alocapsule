import { db } from "@/lib/db";

export function recordRateLimitEvent(key: string) {
  return db.rateLimitEvent.create({ data: { key } });
}

/** تعداد رویدادها از `since` به بعد و زمان قدیمی‌ترین آن‌ها. */
export async function getRateLimitWindow(key: string, since: Date) {
  const result = await db.rateLimitEvent.aggregate({
    where: { key, createdAt: { gte: since } },
    _count: { _all: true },
    _min: { createdAt: true },
  });
  return { count: result._count._all, oldest: result._min.createdAt };
}
