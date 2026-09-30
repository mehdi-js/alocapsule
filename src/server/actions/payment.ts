"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";
import { getCurrentUser } from "@/server/auth/current-user";
import { payWithWallet } from "@/server/services/payment.service";

import { type ActionResult, INVALID_INPUT_MESSAGE, runAction } from "./types";

const orderNumberSchema = z.string().regex(ORDER_NUMBER_PATTERN);

/** پرداخت سفارش از کیف پول. ترتیب: کاربر ← Zod ← service (یک تراکنش) */
export async function payWithWalletAction(
  orderNumber: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "ابتدا وارد حساب خود شوید." };
  const parsed = orderNumberSchema.safeParse(orderNumber);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await payWithWallet({ userId: user.id, orderNumber: parsed.data });
    revalidatePath(`/checkout/pay/${parsed.data}`);
    revalidatePath("/admin/payments", "layout");
    return {};
  });
}
