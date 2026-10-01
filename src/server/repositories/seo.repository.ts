import type { Prisma, SlugEntityType } from "@prisma/client";

import { db } from "@/lib/db";
import type { SeoIndexEntry } from "@/lib/seo/conflicts";

type Tx = Prisma.TransactionClient;

/** فیلدهای سئوی همه‌ی محصولات بایگانی‌نشده و دسته‌ها (برای چک یکتایی) */
export async function listSeoIndex(): Promise<SeoIndexEntry[]> {
  const select = {
    id: true,
    name: true,
    focusKeyword: true,
    seoTitle: true,
    metaDescription: true,
  } as const;
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { archivedAt: null },
      select: { ...select, categoryId: true, description: true },
    }),
    db.category.findMany({ select }),
  ]);
  return [
    ...products.map((p) => ({ kind: "product" as const, ...p })),
    ...categories.map((c) => ({ kind: "category" as const, ...c })),
  ];
}

/**
 * ثبت نامک قبلی در `SlugHistory` (SEO.md §۶.۴). اگر نامک جدید قبلاً در
 * تاریخچه بود (برگشت به نامک قدیمی یا گرفتن نامک قدیمی صفحه‌ی دیگر)، آن
 * ردیف حذف می‌شود چون آن آدرس دوباره زنده است.
 */
export async function recordSlugChange(
  tx: Tx,
  params: {
    entityType: SlugEntityType;
    entityId: string;
    oldSlug: string;
    newSlug: string;
  },
): Promise<void> {
  const { entityType, entityId, oldSlug, newSlug } = params;
  if (oldSlug === newSlug) return;
  await tx.slugHistory.deleteMany({ where: { entityType, oldSlug: newSlug } });
  await tx.slugHistory.upsert({
    where: { entityType_oldSlug: { entityType, oldSlug } },
    create: { entityType, entityId, oldSlug },
    update: { entityId, createdAt: new Date() },
  });
}

export function listSlugHistory(entityType: SlugEntityType, entityId: string) {
  return db.slugHistory.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * آدرس‌های صفحه‌ای که حذف می‌شود ⇒ ریدایرکت 301 دائمی به `toPath`، تا
 * لینک‌های قبلی و رتبه‌ی گوگل به 404 نرسند. تاریخچه‌ی نامک آن صفحه هم
 * پاک می‌شود (جایش را همین ریدایرکت‌ها می‌گیرند).
 */
export async function redirectRemovedEntity(
  tx: Tx,
  params: {
    entityType: SlugEntityType;
    entityId: string;
    fromPaths: string[];
    toPath: string;
    note: string;
  },
): Promise<void> {
  for (const fromPath of new Set(params.fromPaths)) {
    if (fromPath === params.toPath) continue;
    await tx.redirect.upsert({
      where: { fromPath },
      create: {
        fromPath,
        toPath: params.toPath,
        statusCode: 301,
        note: params.note,
      },
      update: {
        toPath: params.toPath,
        statusCode: 301,
        isActive: true,
        note: params.note,
      },
    });
  }
  await tx.slugHistory.deleteMany({
    where: { entityType: params.entityType, entityId: params.entityId },
  });
}
