import type { Prisma, SlugEntityType } from "@prisma/client";

import { db } from "@/lib/db";

import { recordSlugChange, redirectRemovedEntity } from "./seo.repository";

/** صفحات ثابت (`Page`) — SEO.md فاز S4 */

// ───────── صفحات ─────────

export function listPageRows() {
  return db.page.findMany({ orderBy: [{ slug: "asc" }] });
}

export function findPageById(id: string) {
  return db.page.findUnique({ where: { id } });
}

export function findPageBySlug(slug: string) {
  return db.page.findUnique({ where: { slug } });
}

export function listPublishedPageRows() {
  return db.page.findMany({
    where: { isPublished: true },
    select: { slug: true, title: true, noindex: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });
}

export function createPageRow(data: Prisma.PageCreateInput) {
  return db.page.create({ data });
}

// ───────── مشترک: ویرایش با تاریخچه‌ی نامک، حذف با ریدایرکت ─────────

type Entity = "page";

const ENTITY_TYPE: Record<Entity, SlugEntityType> = {
  page: "PAGE",
};

export function updateWithSlugHistory(
  entity: Entity,
  id: string,
  data: Prisma.PageUpdateInput,
  slugChange: { from: string; to: string } | null,
) {
  return db.$transaction(async (tx) => {
    await tx.page.update({ where: { id }, data });
    if (slugChange) {
      await recordSlugChange(tx, {
        entityType: ENTITY_TYPE[entity],
        entityId: id,
        oldSlug: slugChange.from,
        newSlug: slugChange.to,
      });
    }
  });
}

export function deleteWithRedirects(
  entity: Entity,
  params: { id: string; fromPaths: string[]; toPath: string; note: string },
) {
  return db.$transaction(async (tx) => {
    await redirectRemovedEntity(tx, {
      entityType: ENTITY_TYPE[entity],
      entityId: params.id,
      fromPaths: params.fromPaths,
      toPath: params.toPath,
      note: params.note,
    });
    await tx.page.delete({ where: { id: params.id } });
  });
}
