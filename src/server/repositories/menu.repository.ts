import type { Prisma } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";

/** منوی شعبه‌ها: منو ← دسته ← آیتم (هر سطح با `sortOrder`) */

const ordered = {
  categories: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  },
} satisfies Prisma.MenuInclude;

export type MenuWithItems = Prisma.MenuGetPayload<{ include: typeof ordered }>;

export function listMenusWithCounts() {
  return db.menu.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      categories: { select: { _count: { select: { items: true } } } },
    },
  });
}

export function findMenuWithItems(id: string): Promise<MenuWithItems | null> {
  return db.menu.findUnique({ where: { id }, include: ordered });
}

export function findActiveMenuBySlug(
  slug: string,
): Promise<MenuWithItems | null> {
  return db.menu.findFirst({
    where: { slug, isActive: true },
    include: ordered,
  });
}

export function findMenuSlug(id: string) {
  return db.menu.findUnique({ where: { id }, select: { slug: true } });
}

export function listActiveMenuSlugs() {
  return db.menu.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
}

export async function menuSlugExists(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const found = await db.menu.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

// ───────── نوشتن ─────────

export function createMenuRecord(tx: DbClient, data: Prisma.MenuCreateInput) {
  return tx.menu.create({ data, select: { id: true } });
}

export function updateMenuRecord(id: string, data: Prisma.MenuUpdateInput) {
  return db.menu.update({ where: { id }, data, select: { id: true } });
}

export function deleteMenuRecord(id: string) {
  return db.menu.delete({ where: { id } });
}

/** دسته‌ها و آیتم‌های منوی مبدأ به منوی تازه کپی می‌شوند (همان ترتیب و تصاویر) */
export async function copyMenuContent(
  tx: DbClient,
  sourceId: string,
  targetId: string,
): Promise<void> {
  const categories = await tx.menuCategory.findMany({
    where: { menuId: sourceId },
    include: { items: true },
  });
  for (const category of categories) {
    await tx.menuCategory.create({
      data: {
        menuId: targetId,
        name: category.name,
        sortOrder: category.sortOrder,
        items: {
          create: category.items.map((item) => ({
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });
  }
}

export function findCategory(id: string) {
  return db.menuCategory.findUnique({
    where: { id },
    select: { id: true, menuId: true },
  });
}

export async function createCategoryRecord(menuId: string, name: string) {
  const last = await db.menuCategory.aggregate({
    where: { menuId },
    _max: { sortOrder: true },
  });
  return db.menuCategory.create({
    data: { menuId, name, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
}

export function renameCategoryRecord(id: string, name: string) {
  return db.menuCategory.update({ where: { id }, data: { name } });
}

export function deleteCategoryRecord(id: string) {
  return db.menuCategory.delete({ where: { id } });
}

export function listCategoryIds(menuId: string) {
  return db.menuCategory.findMany({
    where: { menuId },
    select: { id: true },
  });
}

export function findItem(id: string) {
  return db.menuItem.findUnique({
    where: { id },
    include: { category: { select: { menuId: true } } },
  });
}

export function listItemIds(categoryId: string) {
  return db.menuItem.findMany({
    where: { categoryId },
    select: { id: true },
  });
}

export async function nextItemSortOrder(categoryId: string): Promise<number> {
  const last = await db.menuItem.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  return (last._max.sortOrder ?? -1) + 1;
}

export function createItemRecord(data: Prisma.MenuItemUncheckedCreateInput) {
  return db.menuItem.create({ data, select: { id: true } });
}

export function updateItemRecord(
  id: string,
  data: Prisma.MenuItemUncheckedUpdateInput,
) {
  return db.menuItem.update({ where: { id }, data, select: { id: true } });
}

export function deleteItemRecord(id: string) {
  return db.menuItem.delete({ where: { id } });
}

/** ترتیب = جایگاه در آرایه؛ در یک تراکنش */
export function reorderCategoryRecords(ids: string[]) {
  return db.$transaction(
    ids.map((id, index) =>
      db.menuCategory.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
}

export function reorderItemRecords(ids: string[]) {
  return db.$transaction(
    ids.map((id, index) =>
      db.menuItem.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
}

/** آدرس‌های تصویر آیتم‌های یک منو/دسته (برای حذف فایل پس از حذف رکورد) */
export async function imageUrlsOf(where: Prisma.MenuItemWhereInput) {
  const items = await db.menuItem.findMany({
    where: { ...where, imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  return items.flatMap((item) => (item.imageUrl ? [item.imageUrl] : []));
}

/** تصاویری که پس از کپی منو بین چند آیتم مشترک‌اند فقط وقتی بی‌مصرف شدند حذف می‌شوند */
export async function unreferencedImageUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];
  const used = await db.menuItem.findMany({
    where: { imageUrl: { in: urls } },
    select: { imageUrl: true },
  });
  const stillUsed = new Set(used.map((item) => item.imageUrl));
  return [...new Set(urls)].filter((url) => !stillUsed.has(url));
}
