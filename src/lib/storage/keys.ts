const KEY_PATTERN = /^[a-z0-9][a-z0-9._/-]{0,199}$/;

/**
 * کلید فایل را قبل از هر دسترسی بررسی می‌کند تا مسیرهای خطرناک
 * (`..`، مسیر مطلق، `//`) هرگز به فایل‌سیستم یا S3 نرسند.
 */
export function assertValidKey(key: string): void {
  if (
    !KEY_PATTERN.test(key) ||
    key.includes("..") ||
    key.includes("//") ||
    key.endsWith("/")
  ) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}
