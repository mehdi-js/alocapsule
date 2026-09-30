"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AdminUserFormInput,
  adminUserInputSchema,
  walletAdjustmentSchema,
} from "@/lib/validation/user";
import { requireAdmin } from "@/server/auth/current-user";
import {
  adjustWalletByAdmin,
  updateUserByAdmin,
  type WalletAdjustmentOutcome,
} from "@/server/services/user-admin.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/** مدیریت کاربران (ادمین). ترتیب: نقش ← Zod ← service (تراکنش + AuditLog) */

const idSchema = z.string().min(1).max(64);

export async function updateUserAction(
  userId: string,
  input: AdminUserFormInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(userId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsed = adminUserInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await updateUserByAdmin(admin.id, id.data, parsed.data);
    revalidatePath("/admin/users", "layout");
    return {};
  });
}

export async function adjustWalletAction(
  userId: string,
  input: unknown,
): Promise<ActionResult<WalletAdjustmentOutcome>> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(userId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsed = walletAdjustmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const outcome = await adjustWalletByAdmin(admin.id, id.data, parsed.data);
    revalidatePath("/admin/users", "layout");
    return outcome;
  });
}
