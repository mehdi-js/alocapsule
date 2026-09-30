import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertValidKey } from "./keys";
import type { StorageDriver, StoragePutParams } from "./types";

/** مسیر عمومی route handler که فایل‌های محلی را سرو می‌کند */
export const LOCAL_MEDIA_PREFIX = "/api/media/";

/**
 * ذخیره در `public/uploads`. Next در production فایل‌های تازه‌اضافه‌شده‌ی
 * `public` را سرو نمی‌کند، پس همه‌چیز از `/api/media/*` عبور می‌کند.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local" as const;

  constructor(
    private readonly baseDir = path.join(process.cwd(), "public", "uploads"),
  ) {}

  private resolve(key: string): string {
    assertValidKey(key);
    const target = path.resolve(this.baseDir, key);
    if (!target.startsWith(path.resolve(this.baseDir) + path.sep)) {
      throw new Error(`Storage key escapes base directory: ${key}`);
    }
    return target;
  }

  async put({ key, body }: StoragePutParams): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    // نوشتن در فایل موقت و rename تا فایل نیمه‌نوشته هرگز سرو نشود
    const temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, body);
    await rename(temp, target);
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  /** فقط driver محلی: برای route handler سرو فایل */
  async read(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  publicUrl(key: string): string {
    assertValidKey(key);
    return `${LOCAL_MEDIA_PREFIX}${key}`;
  }

  keyFromUrl(url: string): string | null {
    return url.startsWith(LOCAL_MEDIA_PREFIX)
      ? url.slice(LOCAL_MEDIA_PREFIX.length)
      : null;
  }
}
