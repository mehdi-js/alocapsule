import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/** 🔴 هیچ شرط یا فیلد موجودی در مسیر سبد وجود ندارد (بخش ۷.۱ سند). */

const itemInclude = {
  variant: {
    include: {
      product: {
        include: {
          images: {
            orderBy: [
              { isPrimary: "desc" as const },
              { sortOrder: "asc" as const },
            ],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartItemRow = Prisma.CartItemGetPayload<{
  include: typeof itemInclude;
}>;

export function findCartByToken(token: string) {
  return db.cart.findUnique({ where: { token } });
}

/** آخرین سبد کاربر */
export function findCartByUserId(userId: string) {
  return db.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export function createCart(data: { token: string; userId: string | null }) {
  return db.cart.create({ data });
}

export function setCartCoupon(cartId: string, couponCode: string | null) {
  return db.cart.update({ where: { id: cartId }, data: { couponCode } });
}

export function attachCartToUser(cartId: string, userId: string) {
  return db.cart.update({ where: { id: cartId }, data: { userId } });
}

export function findCartItems(cartId: string): Promise<CartItemRow[]> {
  return db.cartItem.findMany({
    where: { cartId },
    include: itemInclude,
    orderBy: { id: "asc" },
  });
}

export function findCartItem(cartId: string, variantId: string) {
  return db.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
  });
}

/** متغیر قابل فروش: خودش و محصولش فعال باشند */
export function findSellableVariant(variantId: string) {
  return db.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: { isActive: true } },
    select: { id: true },
  });
}

/**
 * افزودن اتمی: تعداد موجود با increment جمع می‌شود و اگر از سقف گذشت به سقف
 * برمی‌گردد. خروجی تعداد نهایی و این‌که اصلاح شد یا نه.
 */
export async function incrementItem(params: {
  cartId: string;
  variantId: string;
  quantity: number;
  cap: number;
}): Promise<{ quantity: number; capped: boolean }> {
  return db.$transaction(async (tx) => {
    const item = await tx.cartItem.upsert({
      where: {
        cartId_variantId: {
          cartId: params.cartId,
          variantId: params.variantId,
        },
      },
      create: {
        cartId: params.cartId,
        variantId: params.variantId,
        quantity: Math.min(params.quantity, params.cap),
      },
      update: { quantity: { increment: params.quantity } },
      select: { id: true, quantity: true },
    });
    const capped = item.quantity > params.cap || params.quantity > params.cap;
    if (item.quantity > params.cap) {
      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: params.cap },
      });
    }
    await tx.cart.update({
      where: { id: params.cartId },
      data: { updatedAt: new Date() },
    });
    return { quantity: Math.min(item.quantity, params.cap), capped };
  });
}

export function setItemQuantity(
  cartId: string,
  variantId: string,
  quantity: number,
) {
  return db.cartItem.updateMany({
    where: { cartId, variantId },
    data: { quantity },
  });
}

export function deleteItem(cartId: string, variantId: string) {
  return db.cartItem.deleteMany({ where: { cartId, variantId } });
}

export function deleteItemsById(ids: string[]) {
  if (ids.length === 0) return Promise.resolve({ count: 0 });
  return db.cartItem.deleteMany({ where: { id: { in: ids } } });
}

/**
 * ادغام سبد مهمان در سبد کاربر در یک تراکنش: تعدادها جمع و سقف اعمال
 * می‌شود، سپس سبد مهمان حذف می‌شود. خروجی: آیا خطی به سقف اصلاح شد.
 */
export function mergeCartInto(params: {
  fromCartId: string;
  toCartId: string;
  cap: number;
}): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.cartItem.findMany({ where: { cartId: params.fromCartId } }),
      tx.cartItem.findMany({ where: { cartId: params.toCartId } }),
    ]);
    const existing = new Map(to.map((item) => [item.variantId, item]));
    let capped = false;

    for (const item of from) {
      const target = existing.get(item.variantId);
      const total = (target?.quantity ?? 0) + item.quantity;
      const quantity = Math.min(total, params.cap);
      if (total > params.cap) capped = true;
      if (target) {
        await tx.cartItem.update({
          where: { id: target.id },
          data: { quantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: params.toCartId,
            variantId: item.variantId,
            quantity,
          },
        });
      }
    }

    await tx.cart.delete({ where: { id: params.fromCartId } });
    await tx.cart.update({
      where: { id: params.toCartId },
      data: { updatedAt: new Date() },
    });
    return capped;
  });
}
