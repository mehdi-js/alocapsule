import { tmpdir } from "node:os";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

/**
 * تست‌های e2e چهار مسیر بحرانی (فاز ۱۳). روی سرور توسعه با پیامک console
 * اجرا می‌شوند (کد OTP از فایل outbox خوانده می‌شود) و به Postgres توسعه
 * (`DATABASE_URL` در `.env`) نیاز دارند.
 *
 * اجرا: npm run test:e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3300);
export const E2E_TMP = path.join(tmpdir(), "alocapsule-e2e");
export const SMS_OUTBOX = path.join(E2E_TMP, "sms-outbox.jsonl");
/** رمز اصلی ادمین در طول تست؛ بیرون از E2E_TMP تا اجرای نیمه‌کاره گمش نکند */
export const ADMIN_BACKUP = path.join(tmpdir(), "alocapsule-e2e-admin.json");
/** اتصال پیامکِ پنل در طول تست کنار گذاشته می‌شود تا پیامک واقعی نرود */
/** روش‌های ارسال seed پیش از تست (دیتابیس توسعه ممکن است ویرایش‌شده باشد؛ بعد از تست برمی‌گردد) */
export const SHIPPING_BACKUP = path.join(
  tmpdir(),
  "alocapsule-e2e-shipping.json",
);
export const SMS_CONNECTION_BACKUP = path.join(
  tmpdir(),
  "alocapsule-e2e-sms-connection.json",
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fa-IR",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      SMS_PROVIDER: "console",
      SMS_CONSOLE_OUTBOX: SMS_OUTBOX,
      PRIVATE_STORAGE_DIR: path.join(E2E_TMP, "private"),
    },
  },
});
