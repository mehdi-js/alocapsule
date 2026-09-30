"use server";

import { z } from "zod";

import {
  type ProductFormInput,
  productInputSchema,
} from "@/lib/validation/product";
import { requireAdmin } from "@/server/auth/current-user";
import {
  archiveProduct,
  changeProductActive,
  changeVariantActive,
  createProduct,
  deleteProductPermanently,
  type ProductSaveResult,
  restoreProduct,
  updateProduct,
} from "@/server/services/product.service";
import { duplicateProduct } from "@/server/services/product-duplicate.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  revalidateCatalog,
  runAction,
  validationFailure,
} from "./types";

/**
 * ترتیب هر اکشن: ۱) نقش ادمین ← ۲) اعتبارسنجی Zod ← ۳) service ←
 * ۴) خروجی typed ← ۵) revalidate.
 */

const idSchema = z.string().min(1);

/** مقصد ریدایرکت بایگانی: فقط مسیر داخلی */
const redirectTargetSchema = z
  .string()
  .trim()
  .max(300)
  .regex(
    /^\/(?!\/)\S*$/,
    "مقصد ریدایرکت باید مسیری داخلی مثل /category/example-category باشد",
  )
  .nullish()
  .transform((value) => value || null);

export async function createProductAction(
  input: ProductFormInput,
): Promise<ActionResult<ProductSaveResult>> {
  await requireAdmin();
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const product = await createProduct(parsed.data);
    revalidateCatalog();
    return product;
  });
}

export async function updateProductAction(
  id: string,
  input: ProductFormInput,
): Promise<ActionResult<ProductSaveResult>> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = productInputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const product = await updateProduct(parsedId.data, parsed.data);
    revalidateCatalog();
    return product;
  });
}

export async function setProductActiveAction(
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
    await changeProductActive(parsed.data.id, parsed.data.isActive);
    revalidateCatalog();
    return {};
  });
}

export async function setVariantActiveAction(
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
    await changeVariantActive(parsed.data.id, parsed.data.isActive);
    revalidateCatalog();
    return {};
  });
}

export async function archiveProductAction(
  id: string,
  redirectTo: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ id: idSchema, redirectTo: redirectTargetSchema })
    .safeParse({ id, redirectTo });
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await archiveProduct(parsed.data.id, parsed.data.redirectTo);
    revalidateCatalog();
    return {};
  });
}

export async function restoreProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await restoreProduct(parsed.data);
    revalidateCatalog();
    return {};
  });
}

export async function deleteProductPermanentlyAction(
  id: string,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await deleteProductPermanently(parsed.data);
    revalidateCatalog();
    return {};
  });
}

/** «کپی محصول»: محصول جدید غیرفعال با همه‌ی گزینه‌ها، ترکیب‌ها، قیمت‌ها و تصاویر */
export async function duplicateProductAction(
  id: string,
): Promise<ActionResult<{ id: string; copiedImages: number }>> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    const copy = await duplicateProduct(parsed.data);
    revalidateCatalog();
    return copy;
  });
}
