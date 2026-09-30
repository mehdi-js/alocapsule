"use server";

import { z } from "zod";

import { requireAdmin } from "@/server/auth/current-user";
import {
  changeImageAlt,
  IMAGE_ALT_MAX,
  makeImagePrimary,
  removeProductImage,
  reorderProductImages,
} from "@/server/services/product-image.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  revalidateCatalog,
  runAction,
} from "./types";

/**
 * عملیات روی تصاویر (آپلود از طریق route handler است چون فایل باینری است).
 * ترتیب: نقش ادمین ← Zod ← service ← خروجی typed ← revalidate.
 */

const idSchema = z.string().min(1);

export async function setPrimaryImageAction(
  imageId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(imageId);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await makeImagePrimary(parsed.data);
    revalidateCatalog();
    return {};
  });
}

export async function reorderImagesAction(
  productId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ productId: idSchema, orderedIds: z.array(idSchema).max(50) })
    .safeParse({ productId, orderedIds });
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await reorderProductImages(parsed.data.productId, parsed.data.orderedIds);
    revalidateCatalog();
    return {};
  });
}

export async function deleteImageAction(
  imageId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(imageId);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await removeProductImage(parsed.data);
    revalidateCatalog();
    return {};
  });
}

export async function updateImageAltAction(
  imageId: string,
  alt: string,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({
      imageId: idSchema,
      alt: z
        .string()
        .trim()
        .min(2, "متن جایگزین (alt) تصویر را بنویسید.")
        .max(IMAGE_ALT_MAX, "متن جایگزین طولانی است."),
    })
    .safeParse({ imageId, alt });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? INVALID_INPUT_MESSAGE,
    };
  }

  return runAction(async () => {
    await changeImageAlt(parsed.data.imageId, parsed.data.alt);
    revalidateCatalog();
    return {};
  });
}
