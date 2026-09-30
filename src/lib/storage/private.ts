import path from "node:path";

import { LocalStorageDriver } from "./local-driver";

/**
 * فضای **خصوصی** روی دیسک سرور (رسیدهای پرداخت). بیرون از `public` است و
 * مستقل از `STORAGE_DRIVER`؛ فایل‌ها فقط از route handlerِ دارای چک دسترسی
 * سرو می‌شوند. مسیر با `PRIVATE_STORAGE_DIR` قابل تغییر است (volume در Docker).
 */
export function privateStorageDir(
  env: Record<string, string | undefined> = process.env,
): string {
  return path.resolve(
    env.PRIVATE_STORAGE_DIR || path.join(process.cwd(), "storage", "private"),
  );
}

let cached: LocalStorageDriver | undefined;

export function getPrivateStorage(): LocalStorageDriver {
  cached ??= new LocalStorageDriver(privateStorageDir());
  return cached;
}
