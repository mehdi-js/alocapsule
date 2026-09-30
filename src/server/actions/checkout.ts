"use server";

import { revalidatePath } from "next/cache";

import { placeOrderSchema } from "@/lib/validation/checkout";
import { getCurrentUser } from "@/server/auth/current-user";
import { cartOwner } from "@/server/cart-cookie";
import { createOrder } from "@/server/services/order.service";

import { type ActionResult, runAction, validationFailure } from "./types";

/**
 * ثبت سفارش. ترتیب: کاربر واردشده ← Zod ← `createOrder()` (یک تراکنش) ←
 * شماره‌ی سفارش. مبلغ از کلاینت فقط برای مقایسه گرفته می‌شود، نه محاسبه.
 */
export async function placeOrderAction(
  input: unknown,
): Promise<ActionResult<{ orderNumber: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "برای ثبت سفارش وارد حساب خود شوید." };
  }
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const owner = await cartOwner(user.id);
    const placed = await createOrder(
      { ...owner, userId: user.id },
      parsed.data,
    );
    revalidatePath("/cart");
    revalidatePath("/checkout");
    return { orderNumber: placed.orderNumber };
  });
}
