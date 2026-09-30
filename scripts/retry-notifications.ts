/**
 * تلاش دوباره‌ی پیامک‌های ناموفق سفارش (بند ۷.۶): هر پیامک حداکثر ۳ تلاش
 * (اولین ارسال + تلاش‌های این job). پیامکی که به سقف رسیده دیگر فرستاده
 * نمی‌شود و در صفحه‌ی «پیامک‌ها»ی ادمین با وضعیت ناموفق می‌ماند.
 *
 * اجرا: npm run job:retry-notifications  (راهنمای cron در فاز ۱۳)
 */
import { db } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { retryFailedNotifications } from "../src/server/services/notification.service";

async function main(): Promise<void> {
  const summary = await retryFailedNotifications();
  logger.info("notification_retry_job", { ...summary });
}

main()
  .catch((error: unknown) => {
    logger.error("notification_retry_job_failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
