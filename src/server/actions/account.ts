"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";
import {
  type ProfileFormInput,
  profileInputSchema,
} from "@/lib/validation/user";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  cancelMyOrder,
  updateProfile,
} from "@/server/services/account.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/** پنل کاربر. ترتیب: کاربر واردشده ← Zod ← service (محدود به همان کاربر) */

const LOGIN_REQUIRED = "ابتدا وارد حساب خود شوید.";

export async function cancelMyOrderAction(
  orderNumber: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_REQUIRED };
  const parsed = z.string().regex(ORDER_NUMBER_PATTERN).safeParse(orderNumber);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await cancelMyOrder(user.id, parsed.data);
    revalidatePath("/account", "layout");
    revalidatePath(`/checkout/pay/${parsed.data}`);
    revalidatePath("/admin/orders", "layout");
    return {};
  });
}

export async function updateProfileAction(
  input: ProfileFormInput,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_REQUIRED };
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await updateProfile(user.id, parsed.data);
    revalidatePath("/account", "layout");
    return {};
  });
}
