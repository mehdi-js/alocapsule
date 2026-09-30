"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  menuCategoryInputSchema,
  type MenuFormInput,
  menuInputSchema,
  type MenuItemFormInput,
  menuItemInputSchema,
  reorderSchema,
} from "@/lib/validation/menu";
import { requireAdmin } from "@/server/auth/current-user";
import {
  addMenuCategory,
  createMenu,
  deleteMenu,
  deleteMenuCategory,
  deleteMenuItem,
  renameMenuCategory,
  reorderMenuCategories,
  reorderMenuItems,
  saveMenuItem,
  updateMenu,
} from "@/server/services/menu.service";
import { removeMenuItemImage } from "@/server/services/menu-image.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

const id = z.string().min(1);
const invalid = { ok: false as const, message: INVALID_INPUT_MESSAGE };

/** صفحه‌های عمومی منوهای تغییرکرده + پنل ادمین */
function revalidateMenus(slugs: (string | null)[]): void {
  for (const slug of slugs) if (slug) revalidatePath(`/menu/${slug}`);
  revalidatePath("/admin/menus", "layout");
}

export async function createMenuAction(
  input: MenuFormInput,
  copyFromId: string | null,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = menuInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const source = id.nullable().safeParse(copyFromId || null);
  if (!source.success) return invalid;

  return runAction(async () => {
    const result = await createMenu(parsed.data, source.data);
    revalidateMenus(result.slugs);
    return { id: result.id };
  });
}

export async function updateMenuAction(
  menuId: string,
  input: MenuFormInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = menuInputSchema.safeParse(input);
  if (!id.safeParse(menuId).success) return invalid;
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    revalidateMenus((await updateMenu(menuId, parsed.data)).slugs);
    return {};
  });
}

export async function deleteMenuAction(menuId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id.safeParse(menuId).success) return invalid;
  return runAction(async () => {
    revalidateMenus((await deleteMenu(menuId)).slugs);
    return {};
  });
}

export async function saveMenuCategoryAction(
  menuId: string,
  categoryId: string | null,
  input: { name: string },
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = menuCategoryInputSchema.safeParse(input);
  if (!id.safeParse(menuId).success) return invalid;
  if (categoryId !== null && !id.safeParse(categoryId).success) return invalid;
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    if (categoryId) {
      revalidateMenus(
        (await renameMenuCategory(categoryId, parsed.data.name)).slugs,
      );
      return { id: categoryId };
    }
    const result = await addMenuCategory(menuId, parsed.data.name);
    revalidateMenus(result.slugs);
    return { id: result.id };
  });
}

export async function deleteMenuCategoryAction(
  categoryId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!id.safeParse(categoryId).success) return invalid;
  return runAction(async () => {
    revalidateMenus((await deleteMenuCategory(categoryId)).slugs);
    return {};
  });
}

export async function saveMenuItemAction(
  menuId: string,
  itemId: string | null,
  input: MenuItemFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = menuItemInputSchema.safeParse(input);
  if (!id.safeParse(menuId).success) return invalid;
  if (itemId !== null && !id.safeParse(itemId).success) return invalid;
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const result = await saveMenuItem(menuId, itemId, parsed.data);
    revalidateMenus(result.slugs);
    return { id: result.id };
  });
}

export async function deleteMenuItemAction(
  itemId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!id.safeParse(itemId).success) return invalid;
  return runAction(async () => {
    revalidateMenus((await deleteMenuItem(itemId)).slugs);
    return {};
  });
}

export async function removeMenuItemImageAction(
  itemId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!id.safeParse(itemId).success) return invalid;
  return runAction(async () => {
    revalidateMenus([(await removeMenuItemImage(itemId)).slug]);
    return {};
  });
}

export async function reorderMenuCategoriesAction(
  menuId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderSchema.safeParse(orderedIds);
  if (!id.safeParse(menuId).success || !parsed.success) return invalid;
  return runAction(async () => {
    revalidateMenus((await reorderMenuCategories(menuId, parsed.data)).slugs);
    return {};
  });
}

export async function reorderMenuItemsAction(
  categoryId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderSchema.safeParse(orderedIds);
  if (!id.safeParse(categoryId).success || !parsed.success) return invalid;
  return runAction(async () => {
    revalidateMenus((await reorderMenuItems(categoryId, parsed.data)).slugs);
    return {};
  });
}
