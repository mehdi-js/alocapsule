"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { trackingCodeSchema } from "@/lib/validation/order";
import { requireAdmin } from "@/server/auth/current-user";
import {
  deleteOrder,
  deletePayment,
} from "@/server/services/order-delete.service";
import {
  markOrderDelivered,
  shipOrder,
} from "@/server/services/order-fulfillment.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/** ارسال، تحویل و حذف سفارش (ادمین). ترتیب: نقش ← Zod ← service ← revalidate */

const idSchema = z.string().min(1).max(64);

function revalidateOrders(): void {
  revalidatePath("/admin/orders", "layout");
  revalidatePath("/admin/payments", "layout");
}

export async function shipOrderAction(
  orderId: string,
  trackingCode: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(orderId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsed = z
    .object({ trackingCode: trackingCodeSchema })
    .safeParse({ trackingCode });
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await shipOrder(admin.id, id.data, parsed.data.trackingCode);
    revalidateOrders();
    return {};
  });
}

export async function markDeliveredAction(
  orderId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(orderId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await markOrderDelivered(admin.id, id.data);
    revalidateOrders();
    return {};
  });
}

/** حذف دائمی سفارش؛ ادمین باید شماره‌ی سفارش را برای تأیید تایپ کند */
export async function deleteOrderAction(
  orderId: string,
  confirmOrderNumber: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(orderId);
  const confirm = z.string().max(40).safeParse(confirmOrderNumber);
  if (!id.success || !confirm.success) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return runAction(async () => {
    await deleteOrder(admin.id, id.data, confirm.data);
    revalidateOrders();
    revalidatePath("/admin", "layout");
    revalidatePath("/account", "layout");
    return {};
  });
}

/** حذف یک پرداخت ردشده یا بی‌استفاده */
export async function deletePaymentAction(
  paymentId: string,
): Promise<ActionResult<{ orderId: string }>> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(paymentId);
  if (!id.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  return runAction(async () => {
    const result = await deletePayment(admin.id, id.data);
    revalidateOrders();
    revalidatePath("/account", "layout");
    return result;
  });
}
