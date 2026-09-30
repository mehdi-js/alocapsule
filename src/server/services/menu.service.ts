import { db } from "@/lib/db";
import type { MenuInput, MenuItemInput } from "@/lib/validation/menu";
import { getUniqueViolationTarget, UserFacingError } from "@/server/errors";
import {
  copyMenuContent,
  createCategoryRecord,
  createItemRecord,
  createMenuRecord,
  deleteCategoryRecord,
  deleteItemRecord,
  deleteMenuRecord,
  findCategory,
  findItem,
  findMenuSlug,
  imageUrlsOf,
  listCategoryIds,
  listItemIds,
  menuSlugExists,
  nextItemSortOrder,
  renameCategoryRecord,
  reorderCategoryRecords,
  reorderItemRecords,
  updateItemRecord,
  updateMenuRecord,
} from "@/server/repositories/menu.repository";

import { deleteUnusedMenuImages } from "./menu-image.service";

/**
 * مدیریت منوی شعبه‌ها (ادمین). هر تابع slug منوهای تغییرکرده را برمی‌گرداند
 * تا اکشن همان صفحه‌های `/menu/<slug>` را بازسازی کند.
 */

const SLUG_TAKEN = "این نشانی برای منوی دیگری استفاده شده است.";

async function requireMenuSlug(menuId: string): Promise<string> {
  const menu = await findMenuSlug(menuId);
  if (!menu) throw new UserFacingError("منو یافت نشد.");
  return menu.slug;
}

async function requireCategory(categoryId: string, menuId?: string) {
  const category = await findCategory(categoryId);
  if (!category || (menuId && category.menuId !== menuId)) {
    throw new UserFacingError("دسته یافت نشد.");
  }
  return category;
}

async function requireItem(itemId: string) {
  const item = await findItem(itemId);
  if (!item) throw new UserFacingError("آیتم یافت نشد.");
  return item;
}

function rethrowSlugConflict(error: unknown): never {
  if (getUniqueViolationTarget(error)?.includes("slug")) {
    throw new UserFacingError(SLUG_TAKEN);
  }
  throw error;
}

// ───────── منو ─────────

export async function createMenu(
  input: MenuInput,
  copyFromId: string | null,
): Promise<{ id: string; slugs: string[] }> {
  if (await menuSlugExists(input.slug)) throw new UserFacingError(SLUG_TAKEN);
  if (copyFromId) await requireMenuSlug(copyFromId);
  try {
    const menu = await db.$transaction(async (tx) => {
      const created = await createMenuRecord(tx, input);
      if (copyFromId) await copyMenuContent(tx, copyFromId, created.id);
      return created;
    });
    return { id: menu.id, slugs: [input.slug] };
  } catch (error) {
    rethrowSlugConflict(error);
  }
}

export async function updateMenu(
  id: string,
  input: MenuInput,
): Promise<{ slugs: string[] }> {
  const previous = await requireMenuSlug(id);
  if (await menuSlugExists(input.slug, id)) {
    throw new UserFacingError(SLUG_TAKEN);
  }
  try {
    await updateMenuRecord(id, input);
  } catch (error) {
    rethrowSlugConflict(error);
  }
  return { slugs: [...new Set([previous, input.slug])] };
}

export async function deleteMenu(id: string): Promise<{ slugs: string[] }> {
  const slug = await requireMenuSlug(id);
  const urls = await imageUrlsOf({ category: { menuId: id } });
  await deleteMenuRecord(id);
  await deleteUnusedMenuImages(urls);
  return { slugs: [slug] };
}

// ───────── دسته ─────────

export async function addMenuCategory(
  menuId: string,
  name: string,
): Promise<{ id: string; slugs: string[] }> {
  const slug = await requireMenuSlug(menuId);
  const category = await createCategoryRecord(menuId, name);
  return { id: category.id, slugs: [slug] };
}

export async function renameMenuCategory(
  categoryId: string,
  name: string,
): Promise<{ slugs: string[] }> {
  const category = await requireCategory(categoryId);
  await renameCategoryRecord(categoryId, name);
  return { slugs: [await requireMenuSlug(category.menuId)] };
}

export async function deleteMenuCategory(
  categoryId: string,
): Promise<{ slugs: string[] }> {
  const category = await requireCategory(categoryId);
  const urls = await imageUrlsOf({ categoryId });
  await deleteCategoryRecord(categoryId);
  await deleteUnusedMenuImages(urls);
  return { slugs: [await requireMenuSlug(category.menuId)] };
}

/** ترتیب جدید باید دقیقاً همان مجموعه‌ی فعلی باشد (جلوی داده‌ی کهنه را می‌گیرد) */
function assertSameSet(current: { id: string }[], ordered: string[]): void {
  const ids = new Set(current.map((row) => row.id));
  const same =
    ordered.length === ids.size && ordered.every((id) => ids.has(id));
  if (!same) {
    throw new UserFacingError(
      "منو در این فاصله تغییر کرده است. صفحه را دوباره بارگذاری کنید.",
    );
  }
}

export async function reorderMenuCategories(
  menuId: string,
  orderedIds: string[],
): Promise<{ slugs: string[] }> {
  const slug = await requireMenuSlug(menuId);
  assertSameSet(await listCategoryIds(menuId), orderedIds);
  await reorderCategoryRecords(orderedIds);
  return { slugs: [slug] };
}

// ───────── آیتم ─────────

export async function saveMenuItem(
  menuId: string,
  itemId: string | null,
  input: MenuItemInput,
): Promise<{ id: string; slugs: string[] }> {
  const slug = await requireMenuSlug(menuId);
  await requireCategory(input.categoryId, menuId);
  const fields = {
    name: input.name,
    description: input.description,
    price: input.price,
  };

  if (!itemId) {
    const item = await createItemRecord({
      ...fields,
      categoryId: input.categoryId,
      sortOrder: await nextItemSortOrder(input.categoryId),
    });
    return { id: item.id, slugs: [slug] };
  }

  const item = await requireItem(itemId);
  if (item.category.menuId !== menuId) {
    throw new UserFacingError("آیتم یافت نشد.");
  }
  // انتقال به دسته‌ی دیگر ⇒ انتهای آن دسته
  const moved = item.categoryId !== input.categoryId;
  await updateItemRecord(itemId, {
    ...fields,
    ...(moved
      ? {
          categoryId: input.categoryId,
          sortOrder: await nextItemSortOrder(input.categoryId),
        }
      : {}),
  });
  return { id: itemId, slugs: [slug] };
}

export async function deleteMenuItem(
  itemId: string,
): Promise<{ slugs: string[] }> {
  const item = await requireItem(itemId);
  await deleteItemRecord(itemId);
  if (item.imageUrl) await deleteUnusedMenuImages([item.imageUrl]);
  return { slugs: [await requireMenuSlug(item.category.menuId)] };
}

export async function reorderMenuItems(
  categoryId: string,
  orderedIds: string[],
): Promise<{ slugs: string[] }> {
  const category = await requireCategory(categoryId);
  assertSameSet(await listItemIds(categoryId), orderedIds);
  await reorderItemRecords(orderedIds);
  return { slugs: [await requireMenuSlug(category.menuId)] };
}
