import { randomUUID } from "node:crypto";

import { INVALID_IMAGE_MESSAGE, MAX_IMAGE_BYTES } from "@/lib/image/config";
import { processMenuImage } from "@/lib/image/process";
import { detectImageType } from "@/lib/image/sniff";
import { menuImageKey } from "@/lib/image/urls";
import { logger } from "@/lib/logger";
import { getStorage, type StorageDriver } from "@/lib/storage";
import { toPersianDigits } from "@/lib/utils";
import { UserFacingError } from "@/server/errors";
import {
  findItem,
  findMenuSlug,
  unreferencedImageUrls,
  updateItemRecord,
} from "@/server/repositories/menu.repository";

/**
 * تصویر بندانگشتی آیتم منو: اعتبارسنجی (حجم، magic bytes) ← مربع WebP ←
 * ذخیره ← ثبت روی آیتم. تصویر قبلی فقط اگر آیتم دیگری (کپی منو) از آن
 * استفاده نکند حذف می‌شود.
 */

/** حذف بی‌خطای فایل‌هایی که دیگر هیچ آیتمی به آن‌ها اشاره نمی‌کند */
export async function deleteUnusedMenuImages(
  urls: string[],
  storage: StorageDriver = getStorage(),
): Promise<void> {
  const unused = await unreferencedImageUrls(urls);
  await Promise.all(
    unused.map(async (url) => {
      const key = storage.keyFromUrl(url);
      if (!key) return;
      await storage.delete(key).catch((error: unknown) => {
        logger.error("menu_image_delete_failed", error, { key });
      });
    }),
  );
}

async function requireItemWithSlug(itemId: string) {
  const item = await findItem(itemId);
  if (!item) throw new UserFacingError("آیتم یافت نشد.");
  const menu = await findMenuSlug(item.category.menuId);
  return { item, slug: menu?.slug ?? null };
}

export async function setMenuItemImage(
  itemId: string,
  file: Buffer,
  storage: StorageDriver = getStorage(),
): Promise<{ imageUrl: string; slug: string | null }> {
  if (file.length === 0 || file.length > MAX_IMAGE_BYTES) {
    throw new UserFacingError(
      file.length === 0
        ? "فایل خالی است."
        : `حجم فایل بیشتر از ${toPersianDigits(MAX_IMAGE_BYTES / 1024 / 1024)} مگابایت است.`,
    );
  }
  if (detectImageType(file) === null) {
    throw new UserFacingError(INVALID_IMAGE_MESSAGE);
  }
  const { item, slug } = await requireItemWithSlug(itemId);

  let body: Buffer;
  try {
    body = await processMenuImage(file);
  } catch {
    throw new UserFacingError(INVALID_IMAGE_MESSAGE);
  }

  const key = menuImageKey(randomUUID());
  await storage.put({ key, body, contentType: "image/webp" });
  const imageUrl = storage.publicUrl(key);
  try {
    await updateItemRecord(itemId, { imageUrl });
  } catch (error) {
    await storage.delete(key).catch(() => undefined);
    throw error;
  }
  if (item.imageUrl) await deleteUnusedMenuImages([item.imageUrl], storage);
  return { imageUrl, slug };
}

export async function removeMenuItemImage(
  itemId: string,
): Promise<{ slug: string | null }> {
  const { item, slug } = await requireItemWithSlug(itemId);
  if (!item.imageUrl) return { slug };
  await updateItemRecord(itemId, { imageUrl: null });
  await deleteUnusedMenuImages([item.imageUrl]);
  return { slug };
}
