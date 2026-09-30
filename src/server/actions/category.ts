"use server";

import { z } from "zod";

import {
  type CategoryFormInput,
  categoryInputSchema,
} from "@/lib/validation/category";
import { requireAdmin } from "@/server/auth/current-user";
import {
  type CategorySaveResult,
  changeCategoryActive,
  createCategory,
  removeCategory,
  updateCategory,
} from "@/server/services/category.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  revalidateCatalog,
  runAction,
  validationFailure,
} from "./types";

const idSchema = z.string().min(1);

export async function createCategoryAction(
  input: CategoryFormInput,
): Promise<ActionResult<CategorySaveResult>> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const category = await createCategory(parsed.data);
    revalidateCatalog();
    return category;
  });
}

export async function updateCategoryAction(
  id: string,
  input: CategoryFormInput,
): Promise<ActionResult<CategorySaveResult>> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const category = await updateCategory(parsedId.data, parsed.data);
    revalidateCatalog();
    return category;
  });
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, isActive: z.boolean() }).safeParse({
    id,
    isActive,
  });
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await changeCategoryActive(parsed.data.id, parsed.data.isActive);
    revalidateCatalog();
    return {};
  });
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await removeCategory(parsed.data);
    revalidateCatalog();
    return {};
  });
}
