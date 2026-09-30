import type { SlugEntityType } from "@prisma/client";

import { db } from "@/lib/db";

import { cardSelect, primaryFirstImages, SELLABLE } from "./catalog.repository";

/**
 * صفحه‌ی محصول و دسته (SEO.md §۴.۳ و §۱۱.۱): محصول غیرفعال هم پیدا می‌شود
 * (صفحه زنده می‌ماند)، بایگانی‌شده برای ریدایرکت، و نامک‌های قبلی.
 */

export function findProductPageRow(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true, parentId: true },
      },
      variants: { orderBy: { unitValue: "asc" } },
      images: primaryFirstImages,
    },
  });
}

/** مقصد فعلی یک نامک قدیمی (SlugHistory) */
export async function findSlugHistoryTarget(
  entityType: SlugEntityType,
  oldSlug: string,
): Promise<string | null> {
  const row = await db.slugHistory.findUnique({
    where: { entityType_oldSlug: { entityType, oldSlug } },
    select: { entityId: true },
  });
  return row?.entityId ?? null;
}

export function findProductRedirectInfo(id: string) {
  return db.product.findUnique({
    where: { id },
    select: {
      slug: true,
      archivedAt: true,
      archiveRedirectTo: true,
      category: { select: { slug: true } },
    },
  });
}

export function findCategoryRedirectInfo(id: string) {
  return db.category.findUnique({
    where: { id },
    select: { slug: true, isActive: true },
  });
}

/** همه‌ی دسته‌ها (کم‌حجم) برای ساخت مسیر breadcrumb */
export function listCategoryTree() {
  return db.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      isActive: true,
    },
  });
}

export function findActiveCategoryPageRow(slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } });
}

/** محصولات قابل فروش دسته‌ها به ترتیب اولویت دسته‌ها (مرتبط‌ها) */
export function findSellableInCategories(params: {
  categoryIds: string[];
  excludeId: string;
  take: number;
}) {
  return db.product.findMany({
    where: {
      ...SELLABLE,
      categoryId: { in: params.categoryIds },
      id: { not: params.excludeId },
    },
    select: { ...cardSelect, categoryId: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: params.take * params.categoryIds.length,
  });
}

/**
 * sitemap (SEO.md §۸.۱): محصولات بایگانی‌نشده و بدون noindex (فعال و
 * غیرفعال) در دسته‌ی فعال، و دسته‌های فعال بدون noindex.
 */
export async function findSitemapEntries() {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: {
        archivedAt: null,
        noindex: false,
        category: { isActive: true },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.category.findMany({
      where: { isActive: true, noindex: false },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return { products, categories };
}

/** دسته‌های اصلی فعال (لینک‌های فوتر) */
export function listTopCategories() {
  return db.category.findMany({
    where: { isActive: true, parentId: null },
    select: { name: true, slug: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 8,
  });
}
