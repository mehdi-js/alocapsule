import {
  getRateLimitWindow,
  recordRateLimitEvent,
} from "@/server/repositories/rate-limit.repository";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  /** فقط وقتی `allowed: false`؛ تا آزاد شدن یک جایگاه */
  retryAfterSeconds: number;
}

/** بدون ثبت رویداد؛ برای وقتی که چند کلید باید هم‌زمان بررسی شوند. */
export async function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitRule,
  now = new Date(),
): Promise<RateLimitCheck> {
  const { count, oldest } = await getRateLimitWindow(
    key,
    new Date(now.getTime() - windowMs),
  );
  if (count < limit || !oldest) return { allowed: true, retryAfterSeconds: 0 };

  const releaseAt = oldest.getTime() + windowMs;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((releaseAt - now.getTime()) / 1000),
    ),
  };
}

export async function recordRateLimit(key: string): Promise<void> {
  await recordRateLimitEvent(key);
}

/** بررسی و ثبت یک کلید؛ اگر مجاز نبود رویدادی ثبت نمی‌شود. */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
  now = new Date(),
): Promise<RateLimitCheck> {
  const check = await checkRateLimit(key, rule, now);
  if (check.allowed) await recordRateLimit(key);
  return check;
}
