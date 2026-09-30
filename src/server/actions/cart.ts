"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth/current-user";
import { getClientIp } from "@/server/auth/request";
import { cartOwner, writeCartToken } from "@/server/cart-cookie";
import {
  addToCart,
  type CartViewDto,
  getCartView,
  removeFromCart,
  updateCartQuantity,
} from "@/server/services/cart.service";
import {
  applyCouponToCart,
  removeCouponFromCart,
} from "@/server/services/cart-coupon.service";

import { type ActionResult, INVALID_INPUT_MESSAGE, runAction } from "./types";

/**
 * سبد خرید برای مهمان هم باز است؛ «احراز هویت» اینجا یعنی تشخیص صاحب سبد
 * (کاربر واردشده یا کوکی مهمان). ترتیب: صاحب ← Zod ← service ← خروجی typed.
 */

const variantIdSchema = z.string().min(1).max(64);
/** سقف واقعی را سرویس از تنظیمات اعمال می‌کند؛ این فقط مرز ورودی است */
const quantitySchema = z.number().int().min(1).max(100_000);

async function currentOwner() {
  const user = await getCurrentUser();
  return cartOwner(user?.id ?? null);
}

type CartResult = ActionResult<{ cart: CartViewDto }>;

/** نمای سبد برای نشانگر هدر و مینی‌کارت (صفحات کش‌شده را پویا نمی‌کند) */
export async function getCartAction(): Promise<CartResult> {
  return runAction(async () => ({
    cart: await getCartView(await currentOwner()),
  }));
}

export async function addToCartAction(
  variantId: string,
  quantity: number,
): Promise<CartResult> {
  const parsed = z
    .object({ variantId: variantIdSchema, quantity: quantitySchema })
    .safeParse({ variantId, quantity });
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    const { view, newToken } = await addToCart(
      await currentOwner(),
      parsed.data.variantId,
      parsed.data.quantity,
    );
    if (newToken) await writeCartToken(newToken);
    revalidatePath("/cart");
    return { cart: view };
  });
}

export async function updateCartItemAction(
  variantId: string,
  quantity: number,
): Promise<CartResult> {
  const parsed = z
    .object({ variantId: variantIdSchema, quantity: quantitySchema })
    .safeParse({ variantId, quantity });
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    const cart = await updateCartQuantity(
      await currentOwner(),
      parsed.data.variantId,
      parsed.data.quantity,
    );
    revalidatePath("/cart");
    return { cart };
  });
}

export async function removeCartItemAction(
  variantId: string,
): Promise<CartResult> {
  const parsed = variantIdSchema.safeParse(variantId);
  if (!parsed.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    const cart = await removeFromCart(await currentOwner(), parsed.data);
    revalidatePath("/cart");
    return { cart };
  });
}

const couponCodeSchema = z
  .string()
  .trim()
  .min(1, "کد تخفیف را وارد کنید")
  .max(64);

/** اعمال کد تخفیف (فقط کاربر واردشده؛ با محدودیت ۲۰ تلاش در ساعت) */
export async function applyCouponAction(code: string): Promise<CartResult> {
  const parsed = couponCodeSchema.safeParse(code);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? INVALID_INPUT_MESSAGE,
    };
  }

  return runAction(async () => {
    const ip = getClientIp(await headers());
    const cart = await applyCouponToCart(await currentOwner(), parsed.data, ip);
    revalidatePath("/cart");
    return { cart };
  });
}

export async function removeCouponAction(): Promise<CartResult> {
  return runAction(async () => {
    const cart = await removeCouponFromCart(await currentOwner());
    revalidatePath("/cart");
    return { cart };
  });
}
