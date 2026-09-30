"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminReasonSchema } from "@/lib/validation/payment";
import { requireAdmin } from "@/server/auth/current-user";
import {
  approvePayment,
  cancelOrderByAdmin,
  rejectPayment,
  type ReviewOutcome,
} from "@/server/services/payment-review.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/**
 * بررسی پرداخت (ادمین). ترتیب: نقش ← Zod ← service ← revalidate.
 * نتیجه‌ی `changed: false` یعنی قبلاً انجام شده بود (idempotent، خطا نیست).
 */

type ReviewResult = ActionResult<ReviewOutcome>;

const idSchema = z.string().min(1).max(64);

function revalidatePayments(): void {
  revalidatePath("/admin/payments", "layout");
  revalidatePath("/checkout/pay/[orderNumber]", "page");
}

export async function approvePaymentAction(
  paymentId: string,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(paymentId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    const outcome = await approvePayment(admin.id, id.data);
    revalidatePayments();
    return outcome;
  });
}

export async function rejectPaymentAction(
  paymentId: string,
  reason: string,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(paymentId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsedReason = z
    .object({ reason: adminReasonSchema })
    .safeParse({ reason });
  if (!parsedReason.success) return validationFailure(parsedReason.error);

  return runAction(async () => {
    const outcome = await rejectPayment(
      admin.id,
      id.data,
      parsedReason.data.reason,
    );
    revalidatePayments();
    return outcome;
  });
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(orderId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsedReason = z
    .object({ reason: adminReasonSchema })
    .safeParse({ reason });
  if (!parsedReason.success) return validationFailure(parsedReason.error);

  return runAction(async () => {
    const outcome = await cancelOrderByAdmin(
      admin.id,
      id.data,
      parsedReason.data.reason,
    );
    revalidatePayments();
    return outcome;
  });
}
