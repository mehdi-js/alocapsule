import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";
import { cache } from "react";

import {
  BANNER_MAX_WIDTH,
  bannerImageUrls,
  BANNERS_KEY,
  type BannersSettings,
  type BannerVariant,
  DEFAULT_BANNERS,
  parseBanners,
} from "@/lib/banners";
import { isBuildWithoutDb } from "@/lib/build-phase";
import { db } from "@/lib/db";
import { INVALID_IMAGE_MESSAGE, MAX_IMAGE_BYTES } from "@/lib/image/config";
import { processBannerImage } from "@/lib/image/process";
import { detectImageType } from "@/lib/image/sniff";
import { bannerImageKey } from "@/lib/image/urls";
import { logger } from "@/lib/logger";
import { getStorage, type StorageDriver } from "@/lib/storage";
import { toPersianDigits } from "@/lib/utils";
import type { BannersInput } from "@/lib/validation/banners";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  getSetting,
  upsertSetting,
} from "@/server/repositories/setting.repository";

/**
 * اسلایدر صفحه‌ی اصلی و تصاویر بنرها (`site.banners`). تصویر جدا آپلود
 * می‌شود و آدرسش در فرم می‌ماند تا «ذخیره»؛ فایل‌هایی که پس از ذخیره دیگر
 * استفاده نمی‌شوند پاک می‌شوند.
 */

export const getBanners = cache(async (): Promise<BannersSettings> => {
  if (isBuildWithoutDb()) return DEFAULT_BANNERS;
  return parseBanners(await getSetting(BANNERS_KEY));
});

export async function uploadBannerImage(
  file: Buffer,
  variant: BannerVariant,
  storage: StorageDriver = getStorage(),
): Promise<string> {
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
  let body: Buffer;
  try {
    body = await processBannerImage(file, BANNER_MAX_WIDTH[variant]);
  } catch {
    throw new UserFacingError(INVALID_IMAGE_MESSAGE);
  }
  const key = bannerImageKey(randomUUID());
  await storage.put({ key, body, contentType: "image/webp" });
  return storage.publicUrl(key);
}

/** فقط تصاویری که خود سایت در پوشه‌ی بنرها ساخته پذیرفته می‌شوند */
function assertOwnBannerUrls(urls: string[], storage: StorageDriver): void {
  for (const url of urls) {
    if (!storage.keyFromUrl(url)?.startsWith("banners/")) {
      throw new UserFacingError(
        "یکی از تصاویر نامعتبر است؛ صفحه را دوباره بارگذاری و تصویر را دوباره انتخاب کنید.",
      );
    }
  }
}

export async function saveBanners(
  adminId: string,
  input: BannersInput,
  storage: StorageDriver = getStorage(),
): Promise<void> {
  const next: BannersSettings = {
    heroSlides: input.heroSlides.map((slide) => ({
      ...slide,
      title: slide.title
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n"),
    })),
    images: input.images,
  };
  const nextUrls = bannerImageUrls(next);
  assertOwnBannerUrls(nextUrls, storage);

  const previousUrls = bannerImageUrls(
    parseBanners(await getSetting(BANNERS_KEY)),
  );
  await upsertSetting(
    BANNERS_KEY,
    JSON.parse(JSON.stringify(next)) as Prisma.InputJsonObject,
  );
  await db.$transaction((tx) =>
    createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.banners_updated",
      entityType: "User",
      entityId: adminId,
      metadata: { slides: next.heroSlides.length, images: nextUrls.length },
    }),
  );

  // تصاویری که دیگر استفاده نمی‌شوند (جایگزین یا حذف‌شده)
  const keep = new Set(nextUrls);
  await Promise.all(
    previousUrls
      .filter((url) => !keep.has(url))
      .map(async (url) => {
        const key = storage.keyFromUrl(url);
        if (!key) return;
        await storage.delete(key).catch((error: unknown) => {
          logger.error("banner_image_delete_failed", error, { key });
        });
      }),
  );
}
