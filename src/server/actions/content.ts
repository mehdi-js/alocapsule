"use server";

import { z } from "zod";

import {
  type BranchFormInput,
  branchInputSchema,
  type PageFormInput,
  pageInputSchema,
  type RedirectFormInput,
  redirectInputSchema,
} from "@/lib/validation/content";
import { requireAdmin } from "@/server/auth/current-user";
import {
  createBranch,
  deleteBranch,
  updateBranch,
} from "@/server/services/branch.service";
import {
  createPage,
  deletePage,
  updatePage,
} from "@/server/services/page.service";
import {
  importRedirectCsv,
  type ImportResult,
  type RedirectSaveResult,
  removeRedirect,
  saveRedirect,
  toggleRedirect,
} from "@/server/services/redirect.service";
import { clearNotFound } from "@/server/services/redirect-query.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  revalidateCatalog,
  runAction,
  validationFailure,
} from "./types";

/**
 * صفحات ثابت، شعب، ریدایرکت‌ها و لاگ ۴۰۴ (SEO.md فاز S4).
 * ترتیب: نقش ادمین ← Zod ← service ← revalidate.
 */

const idSchema = z.string().min(1);

// ───────── صفحات ─────────

export async function savePageAction(
  id: string | null,
  input: PageFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = pageInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    const result = id
      ? await updatePage(id, parsed.data)
      : await createPage(parsed.data);
    revalidateCatalog();
    return result;
  });
}

export async function deletePageAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return runAction(async () => {
    await deletePage(id);
    revalidateCatalog();
    return {};
  });
}

// ───────── شعب ─────────

export async function saveBranchAction(
  id: string | null,
  input: BranchFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = branchInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(async () => {
    const result = id
      ? await updateBranch(id, parsed.data)
      : await createBranch(parsed.data);
    revalidateCatalog();
    return result;
  });
}

export async function deleteBranchAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return runAction(async () => {
    await deleteBranch(id);
    revalidateCatalog();
    return {};
  });
}

// ───────── ریدایرکت‌ها ─────────

export async function saveRedirectAction(
  id: string | null,
  input: RedirectFormInput,
): Promise<ActionResult<RedirectSaveResult>> {
  await requireAdmin();
  const parsed = redirectInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  return runAction(() => saveRedirect(parsed.data, id ?? undefined));
}

export async function deleteRedirectAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return runAction(async () => {
    await removeRedirect(id);
    return {};
  });
}

export async function toggleRedirectAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return runAction(async () => {
    await toggleRedirect(id, isActive);
    return {};
  });
}

export async function importRedirectsAction(
  csv: string,
): Promise<ActionResult<ImportResult>> {
  await requireAdmin();
  const parsed = z.string().max(2_000_000).safeParse(csv);
  if (!parsed.success) {
    return { ok: false, message: "فایل CSV بیش از حد بزرگ است." };
  }
  return runAction(() => importRedirectCsv(parsed.data));
}

// ───────── لاگ ۴۰۴ ─────────

export async function deleteNotFoundAction(
  ids: string[] | "all",
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .union([z.literal("all"), z.array(idSchema).max(500)])
    .safeParse(ids);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  return runAction(async () => {
    await clearNotFound(parsed.data);
    return {};
  });
}
