/**
 * لغو خودکار سفارش‌های پرداخت‌نشده‌ی ۷۲ ساعته (و رسیدهای ردشده‌ای که ۷۲
 * ساعت رسید تازه نگرفته‌اند) + آزادسازی کد تخفیف. هر ساعت اجرا شود.
 *
 * اجرا: npm run job:expire-orders  (راهنمای cron در DEPLOYMENT.md)
 */
import { db } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { expireStaleOrders } from "../src/server/services/order-expiry.service";

async function main(): Promise<void> {
  const summary = await expireStaleOrders();
  logger.info("order_expiry_job", { ...summary });
}

main()
  .catch((error: unknown) => {
    logger.error("order_expiry_job_failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
