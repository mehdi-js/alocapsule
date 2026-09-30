import { randomBytes, randomUUID } from "node:crypto";

import {
  INVALID_IMAGE_MESSAGE,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
} from "@/lib/image/config";
import { processProductImage } from "@/lib/image/process";
import { detectImageType } from "@/lib/image/sniff";
import {
  productImageBaseName,
  productImageFileKeys,
  productImageKeys,
  thumbnailUrl,
} from "@/lib/image/urls";
import { logger } from "@/lib/logger";
import { defaultImageAlt } from "@/lib/seo/image-alt";
import { getStorage, type StorageDriver } from "@/lib/storage";
import { toPersianDigits } from "@/lib/utils";
import { isRecordNotFound, UserFacingError } from "@/server/errors";
import {
  addImageRecord,
  deleteImageRecord,
  findImageById,
  findProductForImage,
  imageUrlExists,
  listProductImages,
  reorderImages,
  setPrimaryImage,
  updateImageAlt,
} from "@/server/repositories/product-image.repository";

import { getBrandName } from "./seo-settings.service";

export const IMAGE_ALT_MAX = 150;

export interface ProductImageDto {
  id: string;
  url: string;
  thumbUrl: string;
  /** متن جایگزین (الزامی، SEO.md §۶.۲) */
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export function toImageDto(image: {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}): ProductImageDto {
  return {
    id: image.id,
    url: image.url,
    thumbUrl: thumbnailUrl(image.url),
    alt: image.alt,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

/** حذف بی‌خطای فایل‌ها؛ شکست حذف فایل نباید عملیات دیتابیس را خراب کند. */
async function deleteFilesQuietly(storage: StorageDriver, keys: string[]) {
  await Promise.all(
    keys.map((key) =>
      storage.delete(key).catch((error: unknown) => {
        logger.error("image_file_delete_failed", error, { key });
      }),
    ),
  );
}

/**
 * اعتبارسنجی (حجم، magic bytes، سلامت decode) → فشرده‌سازی و thumbnail →
 * ذخیره‌ی فایل‌ها → ثبت در دیتابیس. اگر ثبت شکست بخورد فایل‌ها پاک می‌شوند.
 */
export async function addProductImage(
  productId: string,
  file: Buffer,
  storage: StorageDriver = getStorage(),
): Promise<ProductImageDto> {
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
  const product = await findProductForImage(productId);
  if (!product) throw new UserFacingError("محصول یافت نشد.");
  const brandName = await getBrandName();

  let processed;
  try {
    processed = await processProductImage(file);
  } catch {
    // magic bytes درست ولی محتوای خراب یا بمب پیکسلی
    throw new UserFacingError(INVALID_IMAGE_MESSAGE);
  }

  const keys = await freeImageKeys(
    product.slug,
    product._count.images + 1,
    storage,
  );
  const files = [keys.main, keys.thumb, keys.og];
  const contentType = "image/webp";
  await storage.put({ key: keys.main, body: processed.main, contentType });
  try {
    await storage.put({ key: keys.thumb, body: processed.thumb, contentType });
    await storage.put({
      key: keys.og,
      body: processed.og,
      contentType: "image/jpeg",
    });
    const result = await addImageRecord({
      id: randomUUID(),
      productId,
      url: storage.publicUrl(keys.main),
      ogUrl: storage.publicUrl(keys.og),
      width: processed.width,
      height: processed.height,
      maxImages: MAX_IMAGES_PER_PRODUCT,
      altFor: (position) => defaultImageAlt(product.name, brandName, position),
    });
    if (!result.ok) {
      await deleteFilesQuietly(storage, files);
      throw new UserFacingError(
        `حداکثر ${toPersianDigits(MAX_IMAGES_PER_PRODUCT)} تصویر برای هر محصول مجاز است.`,
      );
    }
    return toImageDto(result.image);
  } catch (error) {
    if (!(error instanceof UserFacingError)) {
      await deleteFilesQuietly(storage, files);
    }
    throw error;
  }
}

/**
 * نام فایل `{نامک}-{ردیف}-{۴ نویسه}`؛ اگر (به‌ندرت) همین نام قبلاً ثبت شده
 * باشد، نویسه‌های تصادفی دوباره ساخته می‌شوند تا فایل دیگری بازنویسی نشود.
 */
async function freeImageKeys(
  slug: string,
  index: number,
  storage: StorageDriver,
) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const keys = productImageKeys(
      productImageBaseName(slug, index, randomBytes(2).toString("hex")),
    );
    if (!(await imageUrlExists(storage.publicUrl(keys.main)))) return keys;
  }
  throw new Error("image_name_collision");
}

/** alt الزامی (SEO.md §۶.۲)؛ خالی ⇒ خطای اعتبارسنجی */
export async function changeImageAlt(imageId: string, alt: string) {
  const text = alt.replace(/\s+/g, " ").trim();
  if (text.length < 2) {
    throw new UserFacingError("متن جایگزین (alt) تصویر را بنویسید.");
  }
  if (text.length > IMAGE_ALT_MAX) {
    throw new UserFacingError(
      `متن جایگزین حداکثر ${toPersianDigits(IMAGE_ALT_MAX)} کاراکتر باشد.`,
    );
  }
  await requireImage(imageId);
  await updateImageAlt(imageId, text);
}

async function requireImage(imageId: string) {
  const image = await findImageById(imageId);
  if (!image) throw new UserFacingError("تصویر یافت نشد.");
  return image;
}

export async function makeImagePrimary(imageId: string): Promise<void> {
  const image = await requireImage(imageId);
  await setPrimaryImage(image.productId, image.id);
}

/** ترتیب جدید باید دقیقاً همان مجموعه‌ی تصاویر محصول باشد. */
export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
): Promise<void> {
  const current = await listProductImages(productId);
  const currentIds = new Set(current.map((image) => image.id));
  const valid =
    orderedIds.length === currentIds.size &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIds.has(id));
  if (!valid) {
    throw new UserFacingError(
      "فهرست تصاویر تغییر کرده است. صفحه را دوباره بارگذاری کنید.",
    );
  }
  await reorderImages(orderedIds);
}

export async function removeProductImage(
  imageId: string,
  storage: StorageDriver = getStorage(),
): Promise<void> {
  const image = await requireImage(imageId);
  try {
    await deleteImageRecord(image);
  } catch (error) {
    if (isRecordNotFound(error)) return; // حذف هم‌زمان توسط درخواست دیگر
    throw error;
  }

  // فایل‌ها فقط اگر متعلق به driver فعلی باشند حذف می‌شوند (آدرس قدیمی driver
  // قبلی نادیده گرفته می‌شود).
  const key = storage.keyFromUrl(image.url);
  if (key) await deleteFilesQuietly(storage, productImageFileKeys(key));
}

/** حذف فایل‌های چند تصویر (مثلاً هنگام حذف کامل محصول)؛ بی‌خطا و فقط برای آدرس‌های driver فعلی. */
export async function deleteImageFilesByUrl(
  urls: string[],
  storage: StorageDriver = getStorage(),
): Promise<void> {
  const keys = urls.flatMap((url) => {
    const key = storage.keyFromUrl(url);
    return key ? productImageFileKeys(key) : [];
  });
  await deleteFilesQuietly(storage, keys);
}
