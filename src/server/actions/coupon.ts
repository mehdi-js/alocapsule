"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateCouponCode } from "@/lib/coupon";
import {
  type CouponFormInput,
  couponInputSchema,
} from "@/lib/validation/coupon";
import { requireAdmin } from "@/server/auth/current-user";
import { couponCodeExists } from "@/server/repositories/coupon.repository";
import {
  changeCouponActive,
  createCoupon,
  removeCoupon,
  updateCoupon,
} from "@/server/services/coupon-admin.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/** ترتیب هر اکشن: نقش ادمین ← Zod ← service ← خروجی typed ← revalidate */

const idSchema = z.string().min(1);

function revalidateCoupons() {
  revalidatePath("/admin/coupons", "layout");
  // کد روی سبدها دوباره اعتبارسنجی می‌شود
  revalidatePath("/cart");
}

export async function createCouponAction(
  input: CouponFormInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = couponInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const coupon = await createCoupon(parsed.data, admin.id);
    revalidateCoupons();
    return coupon;
  });
}

export async function updateCouponAction(
  id: string,
  input: CouponFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = couponInputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const coupon = await updateCoupon(parsedId.data, parsed.data);
    revalidateCoupons();
    return coupon;
  });
}

export async function setCouponActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ id: idSchema, isActive: z.boolean() })
    .safeParse({ id, isActive });
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await changeCouponActive(parsed.data.id, parsed.data.isActive);
    revalidateCoupons();
    return {};
  });
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await removeCoupon(parsed.data);
    revalidateCoupons();
    return {};
  });
}

/** کد تصادفیِ آزاد (تکراری نبودنش بررسی می‌شود) */
export async function generateCouponCodeAction(): Promise<
  ActionResult<{ code: string }>
> {
  await requireAdmin();
  return runAction(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCouponCode();
      if (!(await couponCodeExists(code))) return { code };
    }
    throw new Error("could not generate a unique coupon code");
  });
}
