import { LocalStorageDriver } from "./local-driver";
import { S3StorageDriver } from "./s3-driver";
import type { StorageDriver } from "./types";

export { LOCAL_MEDIA_PREFIX, LocalStorageDriver } from "./local-driver";
export type { StorageDriver, StoragePutParams } from "./types";

/** انتخاب driver از `STORAGE_DRIVER` (پیش‌فرض: local) */
export function createStorageDriver(
  env: Record<string, string | undefined> = process.env,
): StorageDriver {
  const name = env.STORAGE_DRIVER || "local";

  if (name === "local") return new LocalStorageDriver();

  if (name === "s3") {
    const endpoint = env.S3_ENDPOINT;
    const bucket = env.S3_BUCKET;
    const accessKey = env.S3_ACCESS_KEY;
    const secretKey = env.S3_SECRET_KEY;
    if (!endpoint || !bucket || !accessKey || !secretKey) {
      throw new Error(
        "برای STORAGE_DRIVER=s3 باید S3_ENDPOINT، S3_BUCKET، S3_ACCESS_KEY و S3_SECRET_KEY تنظیم شوند",
      );
    }
    return new S3StorageDriver({
      endpoint,
      bucket,
      accessKey,
      secretKey,
      region: env.S3_REGION,
      publicUrl: env.S3_PUBLIC_URL,
    });
  }

  throw new Error(`STORAGE_DRIVER نامعتبر است: "${name}"`);
}

let cached: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  cached ??= createStorageDriver();
  return cached;
}
