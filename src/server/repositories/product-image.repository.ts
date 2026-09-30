import { db } from "@/lib/db";

export function findImageById(id: string) {
  return db.productImage.findUnique({ where: { id } });
}

export function listProductImages(productId: string) {
  return db.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

/** نام و نامک محصول (برای نام فایل و alt پیش‌فرض)؛ `null` ⇒ محصول نیست */
export function findProductForImage(productId: string) {
  return db.product.findUnique({
    where: { id: productId },
    select: { name: true, slug: true, _count: { select: { images: true } } },
  });
}

/** آیا فایلی با این آدرس قبلاً ثبت شده؟ (جلوگیری از بازنویسی در برخورد نام) */
export async function imageUrlExists(url: string): Promise<boolean> {
  return (await db.productImage.count({ where: { url } })) > 0;
}

export function updateImageAlt(id: string, alt: string) {
  return db.productImage.update({ where: { id }, data: { alt } });
}

export type AddImageResult =
  | {
      ok: true;
      image: {
        id: string;
        url: string;
        alt: string;
        isPrimary: boolean;
        sortOrder: number;
      };
    }
  | { ok: false; reason: "LIMIT_REACHED" };

/**
 * ثبت تصویر در انتهای لیست؛ اگر اولین تصویر باشد `isPrimary` می‌شود.
 * آپلودهای هم‌زمان یک محصول با قفل advisory (نه قفل ردیف محصول) پشت‌سرهم
 * اجرا می‌شوند تا `sortOrder` و تصویر اصلی و سقف تعداد به هم نریزد.
 */
export function addImageRecord(params: {
  id: string;
  productId: string;
  url: string;
  /** برش OG و ابعاد فایل اصلی (SEO.md §۶.۲) */
  ogUrl: string;
  width: number;
  height: number;
  maxImages: number;
  /** alt الزامی است؛ `position` = جایگاه تصویر در لیست (از ۰) */
  altFor: (position: number) => string;
}): Promise<AddImageResult> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product-images:${params.productId}`}))`;

    const existing = await tx.productImage.findMany({
      where: { productId: params.productId },
      select: { sortOrder: true, isPrimary: true },
    });
    if (existing.length >= params.maxImages) {
      return { ok: false, reason: "LIMIT_REACHED" } as const;
    }

    const image = await tx.productImage.create({
      data: {
        id: params.id,
        productId: params.productId,
        url: params.url,
        ogUrl: params.ogUrl,
        width: params.width,
        height: params.height,
        alt: params.altFor(existing.length),
        sortOrder:
          existing.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1,
        isPrimary: !existing.some((i) => i.isPrimary),
      },
      select: {
        id: true,
        url: true,
        alt: true,
        isPrimary: true,
        sortOrder: true,
      },
    });
    return { ok: true, image } as const;
  });
}

/** فقط یک تصویر اصلی: بقیه خاموش و این یکی روشن، در یک تراکنش. */
export function setPrimaryImage(productId: string, imageId: string) {
  return db.$transaction([
    db.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    }),
    db.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    }),
  ]);
}

/** `sortOrder` هر تصویر = جایگاهش در `orderedIds` */
export function reorderImages(orderedIds: string[]) {
  return db.$transaction(
    orderedIds.map((id, sortOrder) =>
      db.productImage.update({ where: { id }, data: { sortOrder } }),
    ),
  );
}

/**
 * حذف رکورد؛ اگر تصویر اصلی بود، اولین تصویر باقی‌مانده اصلی می‌شود.
 */
export function deleteImageRecord(image: {
  id: string;
  productId: string;
  isPrimary: boolean;
}) {
  return db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: image.id } });
    if (!image.isPrimary) return;
    const next = await tx.productImage.findFirst({
      where: { productId: image.productId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (next) {
      await tx.productImage.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  });
}
