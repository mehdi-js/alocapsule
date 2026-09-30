import { randomBytes } from "node:crypto";

import type { ProductKind, ProductUnit } from "@prisma/client";

import { capMessage, clampQuantity, removedItemMessage } from "@/lib/cart-math";
import { thumbnailUrl } from "@/lib/image/urls";
import { itemsUntilFreeShipping } from "@/lib/order-pricing";
import { isSellable } from "@/lib/service-order";
import { resolveVariantTitle } from "@/lib/unit";
import { UserFacingError } from "@/server/errors";
import {
  attachCartToUser,
  createCart,
  deleteItem,
  deleteItemsById,
  findCartByToken,
  findCartByUserId,
  findCartItem,
  findCartItems,
  findVariantForCart,
  incrementItem,
  mergeCartInto,
  setItemQuantity,
} from "@/server/repositories/cart.repository";
import { listActiveShippingMethods } from "@/server/repositories/shipping.repository";

import { type CartCouponDto, evaluateCartCoupon } from "./coupon.service";
import { getMaxQuantityPerItem } from "./settings.service";

/**
 * سبد خرید. مهمان با کوکی `cart_token` شناخته می‌شود؛ کاربر واردشده با
 * `userId`. قیمت‌ها هرگز در سبد ذخیره نمی‌شوند و هر بار از دیتابیس خوانده
 * می‌شوند (بند ۷.۲ سند).
 */

export const INQUIRY_NOT_ORDERABLE_MESSAGE =
  "قیمت این محصول استعلامی است و سفارش آنلاین ندارد؛ برای استعلام قیمت با ما تماس بگیرید.";

/** کسی که سبد را می‌خواند یا تغییر می‌دهد */
export interface CartOwner {
  userId: string | null;
  /** مقدار کوکی `cart_token` (فقط برای مهمان معنا دارد) */
  token: string | null;
}

export interface CartLineDto {
  variantId: string;
  productId: string;
  categoryId: string;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string | null;
  unit: ProductUnit | null;
  /** خدمت (مثل شارژ) یا کالای فیزیکی؛ سبد مخلوط مجاز است */
  kind: ProductKind;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
}

export type { CartCouponDto };

export interface CartViewDto {
  lines: CartLineDto[];
  coupon: CartCouponDto | null;
  discountTotal: number;
  /** جمع کالاها منهای تخفیف (بدون ارسال) */
  total: number;
  /** کد تخفیف فقط برای کاربر واردشده است */
  canUseCoupon: boolean;
  /** مجموع تعداد اقلام (برای نشانگر هدر و ارسال رایگان تعدادی) */
  itemCount: number;
  /** سبد حداقل یک آیتم خدمت دارد ⇒ پذیرش شرایط در تسویه الزامی است */
  hasService: boolean;
  /** چند عدد دیگر تا رایگان شدن ارسال با پیک؛ `null` = پیشنهادی نیست */
  itemsUntilFreeShipping: number | null;
  subtotal: number;
  maxQuantity: number;
  /** پیام‌های فارسی برای کاربر (حذف اقلام غیرفعال، اصلاح تعداد) */
  notices: string[];
}

export function newCartToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * سبد فعلی بدون ساختن سبد تازه. برای کاربر واردشده، سبد مهمانی که هنوز در
 * کوکی مانده در سبد کاربر ادغام می‌شود (ادغام تنبل، اگر ادغام هنگام ورود رخ نداده).
 */
export async function resolveCart(owner: CartOwner) {
  const guest = owner.token ? await findCartByToken(owner.token) : null;
  // سبدی که به کاربر دیگری تعلق دارد هرگز از روی کوکی قابل دسترسی نیست
  const guestCart = guest && guest.userId === null ? guest : null;

  if (!owner.userId) return guestCart;

  const userCart = await findCartByUserId(owner.userId);
  if (!guestCart) return userCart;
  if (!userCart) return attachCartToUser(guestCart.id, owner.userId);

  await mergeCartInto({
    fromCartId: guestCart.id,
    toCartId: userCart.id,
    cap: await getMaxQuantityPerItem(),
  });
  return userCart;
}

/** ادغام سبد مهمان در سبد کاربر، بلافاصله پس از ورود. */
export async function mergeGuestCart(owner: CartOwner): Promise<void> {
  if (owner.userId && owner.token) await resolveCart(owner);
}

const EMPTY_VIEW = (
  maxQuantity: number,
  canUseCoupon: boolean,
): CartViewDto => ({
  lines: [],
  coupon: null,
  discountTotal: 0,
  total: 0,
  canUseCoupon,
  itemCount: 0,
  hasService: false,
  itemsUntilFreeShipping: null,
  subtotal: 0,
  maxQuantity,
  notices: [],
});

/**
 * نمای سبد. اقلامی که محصول یا متغیرشان غیرفعال شده حذف می‌شوند و تعدادِ
 * بیش از سقف فعلی اصلاح می‌شود؛ هر دو با پیام فارسی اطلاع داده می‌شوند.
 */
export async function getCartView(owner: CartOwner): Promise<CartViewDto> {
  const maxQuantity = await getMaxQuantityPerItem();
  const cart = await resolveCart(owner);
  const canUseCoupon = owner.userId !== null;
  if (!cart) return EMPTY_VIEW(maxQuantity, canUseCoupon);

  const rows = await findCartItems(cart.id);
  const notices: string[] = [];
  const removedIds: string[] = [];
  const lines: CartLineDto[] = [];

  for (const row of rows) {
    const { variant } = row;
    const { product } = variant;
    const variantTitle = resolveVariantTitle(
      product.unit,
      variant.unitValue,
      variant.title,
    );

    if (
      !isSellable({
        variantActive: variant.isActive,
        productActive: product.isActive,
        pricingMode: product.pricingMode,
      })
    ) {
      // غیرفعال یا (بعداً) استعلامی شده ⇒ با همان سازوکار حذف و اطلاع
      removedIds.push(row.id);
      notices.push(removedItemMessage(`${product.name} — ${variantTitle}`));
      continue;
    }

    let quantity = row.quantity;
    if (quantity > maxQuantity) {
      quantity = maxQuantity;
      await setItemQuantity(cart.id, variant.id, quantity);
      notices.push(capMessage(maxQuantity));
    }

    const image = product.images[0];
    lines.push({
      variantId: variant.id,
      productId: product.id,
      categoryId: product.categoryId,
      productName: product.name,
      productSlug: product.slug,
      variantTitle,
      sku: variant.sku,
      unit: product.unit,
      kind: product.kind,
      unitPrice: variant.price,
      quantity,
      lineTotal: variant.price * quantity,
      imageUrl: image ? thumbnailUrl(image.url) : null,
    });
  }

  await deleteItemsById(removedIds);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const coupon =
    cart.couponCode && lines.length > 0
      ? await evaluateCartCoupon(cart.couponCode, owner.userId, lines)
      : null;
  const discountTotal = coupon?.discount ?? 0;

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const shippingMethods =
    lines.length > 0 ? await listActiveShippingMethods() : [];

  return {
    lines,
    coupon,
    discountTotal,
    total: subtotal - discountTotal,
    canUseCoupon,
    itemCount,
    hasService: lines.some((line) => line.kind === "SERVICE"),
    itemsUntilFreeShipping: itemsUntilFreeShipping(shippingMethods, itemCount),
    subtotal,
    maxQuantity,
    notices,
  };
}

export interface CartMutation {
  view: CartViewDto;
  /** اگر سبد تازه‌ای برای مهمان ساخته شد، باید در کوکی ذخیره شود */
  newToken: string | null;
}

export async function addToCart(
  owner: CartOwner,
  variantId: string,
  quantity: number,
): Promise<CartMutation> {
  // 🔴 سمت سرور: محصول استعلامی هرگز وارد سبد نمی‌شود (نه فقط در UI)
  const target = await findVariantForCart(variantId);
  if (target?.product.pricingMode === "INQUIRY") {
    throw new UserFacingError(INQUIRY_NOT_ORDERABLE_MESSAGE);
  }
  if (
    !target ||
    !isSellable({
      variantActive: target.isActive,
      productActive: target.product.isActive,
      pricingMode: target.product.pricingMode,
    })
  ) {
    throw new UserFacingError("این محصول در حال حاضر قابل سفارش نیست.");
  }

  let cart = await resolveCart(owner);
  let newToken: string | null = null;
  if (!cart) {
    const token = newCartToken();
    cart = await createCart({ token, userId: owner.userId });
    if (!owner.userId) newToken = token;
  }

  const cap = await getMaxQuantityPerItem();
  const result = await incrementItem({
    cartId: cart.id,
    variantId,
    quantity: clampQuantity(quantity, Number.MAX_SAFE_INTEGER).quantity,
    cap,
  });

  const nextOwner = { ...owner, token: newToken ?? owner.token };
  const view = await getCartView(nextOwner);
  if (result.capped) view.notices.push(capMessage(cap));
  return { view, newToken };
}

export async function updateCartQuantity(
  owner: CartOwner,
  variantId: string,
  quantity: number,
): Promise<CartViewDto> {
  const cart = await resolveCart(owner);
  if (!cart || !(await findCartItem(cart.id, variantId))) {
    throw new UserFacingError(
      "این قلم در سبد شما نیست. صفحه را دوباره بارگذاری کنید.",
    );
  }

  const cap = await getMaxQuantityPerItem();
  const { quantity: next, capped } = clampQuantity(quantity, cap);
  await setItemQuantity(cart.id, variantId, next);

  const view = await getCartView(owner);
  if (capped) view.notices.push(capMessage(cap));
  return view;
}

export async function removeFromCart(
  owner: CartOwner,
  variantId: string,
): Promise<CartViewDto> {
  const cart = await resolveCart(owner);
  if (cart) await deleteItem(cart.id, variantId);
  return getCartView(owner);
}
