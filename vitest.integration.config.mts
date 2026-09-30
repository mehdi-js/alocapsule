import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// `DATABASE_URL` از `.env` (مثل `db:seed`)؛ متغیرهای محیطی موجود اولویت دارند
if (!process.env.DATABASE_URL && existsSync(".env"))
  process.loadEnvFile(".env");

/**
 * تست‌های یکپارچه روی Postgres واقعی. هر فایل داده‌ی خودش را می‌سازد و در
 * پایان پاک می‌کند؛ فایل‌ها پشت‌سرهم اجرا می‌شوند.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    // رسیدهای تست در پوشه‌ی موقت، نه در storage/private واقعی
    env: {
      PRIVATE_STORAGE_DIR: path.join(tmpdir(), `alocapsule-int-${process.pid}`),
    },
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
