import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { recordSlugChange, redirectRemovedEntity } from "./seo.repository";

export function listActiveCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

// ───────── ادمین ─────────

/** همه‌ی دسته‌ها (فعال و غیرفعال) با تعداد محصول و زیردسته */
export function listAllCategories() {
  return db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });
}

export function findCategoryById(id: string) {
  return db.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { slug: true } },
    },
  });
}

export async function categorySlugExists(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const found = await db.category.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

export function createCategoryRecord(
  data: Prisma.CategoryUncheckedCreateInput,
) {
  return db.category.create({ data });
}

export function updateCategoryRecord(
  id: string,
  data: Prisma.CategoryUncheckedUpdateInput,
) {
  return db.category.update({ where: { id }, data });
}

/** ویرایش دسته؛ تغییر نامک ⇒ نامک قبلی در `SlugHistory` */
export function updateCategoryWithSlugHistory(
  id: string,
  data: Prisma.CategoryUncheckedUpdateInput,
  slugChange: { from: string; to: string } | null,
) {
  return db.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data });
    if (slugChange) {
      await recordSlugChange(tx, {
        entityType: "CATEGORY",
        entityId: id,
        oldSlug: slugChange.from,
        newSlug: slugChange.to,
      });
    }
  });
}

/** حذف دسته + ریدایرکت 301 آدرس فعلی و قبلی‌اش به `toPath` */
export function deleteCategoryWithRedirects(params: {
  id: string;
  fromPaths: string[];
  toPath: string;
}) {
  return db.$transaction(async (tx) => {
    await redirectRemovedEntity(tx, {
      entityType: "CATEGORY",
      entityId: params.id,
      fromPaths: params.fromPaths,
      toPath: params.toPath,
      note: "حذف دسته",
    });
    await tx.category.delete({ where: { id: params.id } });
  });
}
