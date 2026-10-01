"use server";

import { z } from "zod";

import type { SeoConflicts } from "@/lib/seo/analyze";
import {
  type SeoSettingsFormInput,
  seoSettingsSchema,
} from "@/lib/validation/seo-settings";
import { requireAdmin } from "@/server/auth/current-user";
import { getSeoConflicts } from "@/server/services/seo-conflicts.service";
import { saveSeoSettings } from "@/server/services/seo-settings.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  revalidateCatalog,
  runAction,
  validationFailure,
} from "./types";

const targetSchema = z.object({
  kind: z.enum(["product", "category"]),
  id: z.string().min(1).nullable(),
  name: z.string().max(200),
  focusKeyword: z.string().max(200).nullable(),
  seoTitle: z.string().max(200).nullable(),
  metaDescription: z.string().max(400).nullable(),
  /** فقط محصول: دسته و توضیحات برای چک شباهت متن */
  categoryId: z.string().min(1).nullable().optional(),
  description: z.string().max(30_000).nullable().optional(),
});

/** بررسی زنده‌ی تکراری بودن کلمه/عنوان/متا هنگام تایپ در فرم ادمین */
export async function checkSeoConflictsAction(
  target: z.input<typeof targetSchema>,
): Promise<ActionResult<{ conflicts: SeoConflicts }>> {
  await requireAdmin();
  const parsed = targetSchema.safeParse(target);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  return runAction(async () => ({
    conflicts: await getSeoConflicts(parsed.data),
  }));
}

/** «تنظیمات سئو»: همه‌ی صفحات عمومی (عنوان، متا، schema) بازسازی می‌شوند */
export async function saveSeoSettingsAction(
  input: SeoSettingsFormInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = seoSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    await saveSeoSettings(parsed.data);
    revalidateCatalog();
    return {};
  });
}
