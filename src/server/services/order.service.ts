import { removedItemMessage } from "@/lib/cart-math";
import {
  type CouponLine,
  TOTAL_LIMIT_MESSAGE,
  userLimitMessage,
} from "@/lib/coupon";
import { db, type DbClient } from "@/lib/db";
import { formatOrderNumber, orderNumberPrefix } from "@/lib/order-number";
import { type OrderPricing, priceOrder } from "@/lib/order-pricing";
import {
  isServedLocation,
  isShippingAvailableIn,
  OUT_OF_AREA_MESSAGE,
} from "@/lib/service-area";
import {
  collectServiceTerms,
  isSellable,
  SERVICE_TERMS_REQUIRED_MESSAGE,
  type ServiceLine,
} from "@/lib/service-order";
import { resolveVariantTitle } from "@/lib/unit";
import type { PlaceOrderInput } from "@/lib/validation/checkout";
import { resolveServiceTerms } from "@/lib/validation/product";
import { getUniqueViolationTarget, UserFacingError } from "@/server/errors";
import { findUserAddress } from "@/server/repositories/address.repository";
import { countUserRedemptions } from "@/server/repositories/coupon.repository";
import {
  claimCouponUse,
  consumeCart,
  createCouponRedemption,
  createOrderRecord,
  createPendingPayment,
  findActiveShippingMethod,
  findCartCoupon,
  findCheckoutItems,
  nextOrderSequence,
  type OrderItemSnapshot,
  readOrderNumberPrefix,
  readServiceDefaultTerms,
} from "@/server/repositories/order.repository";

import {
  type CartOwner,
  getCartView,
  INQUIRY_NOT_ORDERABLE_MESSAGE,
  resolveCart,
} from "./cart.service";
import { evaluateCoupon } from "./coupon.service";
import { publishOrderEvent } from "./order-events";

/**
 * ثبت سفارش (فاز ۸). 🔴 همه‌چیز داخل **یک تراکنش**: اگر هر مرحله شکست بخورد
 * هیچ سفارش، redemption یا پرداختی باقی نمی‌ماند. 🔴 هیچ قفل ردیف روی
 * محصول/متغیر و هیچ کسر موجودی وجود ندارد (بند ۷.۱).
 */

export const EMPTY_CART_MESSAGE = "سبد خرید شما خالی است.";
export const PRICE_CHANGED_MESSAGE =
  "مبلغ سفارش تغییر کرده است. خلاصه‌ی تازه را بررسی و دوباره «ثبت سفارش» را بزنید.";
export const CART_CHANGED_MESSAGE =
  "سبد خرید شما هم‌زمان تغییر کرد. لطفاً سبد را بررسی و دوباره تلاش کنید.";

/** شماره‌گذاری با قفل مشورتی پشت‌سرهم است؛ تلاش دوباره فقط برای اطمینان */
const ORDER_NUMBER_ATTEMPTS = 3;

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  grandTotal: number;
}

interface PlaceContext {
  userId: string;
  cartId: string;
  input: PlaceOrderInput;
  now: Date;
}

async function placeOrderTx(
  tx: DbClient,
  ctx: PlaceContext,
): Promise<PlacedOrder> {
  // ۱) اعتبارسنجی سبد: قلم غیرفعال ⇒ سفارش ثبت نمی‌شود
  const rows = await findCheckoutItems(tx, ctx.cartId);
  if (rows.length === 0) throw new UserFacingError(EMPTY_CART_MESSAGE);

  // ۲) محاسبه‌ی مجدد قیمت از دیتابیس (هرگز از کلاینت)
  const items: OrderItemSnapshot[] = [];
  const couponLines: CouponLine[] = [];
  const serviceLines: ServiceLine[] = [];
  let itemCount = 0;
  for (const row of rows) {
    itemCount += row.quantity;
    const { variant } = row;
    const { product } = variant;
    const variantTitle = resolveVariantTitle(
      product.unit,
      variant.unitValue,
      variant.title,
    );
    // 🔴 سمت سرور: استعلامی هرگز سفارش نمی‌شود (حتی اگر بعد از افزودن به سبد استعلامی شده)
    if (product.pricingMode === "INQUIRY") {
      throw new UserFacingError(INQUIRY_NOT_ORDERABLE_MESSAGE);
    }
    if (
      !isSellable({
        variantActive: variant.isActive,
        productActive: product.isActive,
        pricingMode: product.pricingMode,
      })
    ) {
      throw new UserFacingError(
        removedItemMessage(`${product.name} — ${variantTitle}`),
      );
    }
    items.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantTitle,
      unitPrice: variant.price,
      quantity: row.quantity,
      lineTotal: variant.price * row.quantity,
      unitValueSnapshot: variant.unitValue,
      unitSnapshot: product.unit,
      productKindSnapshot: product.kind,
    });
    serviceLines.push({
      kind: product.kind,
      productName: product.name,
      terms: product.serviceTerms,
    });
    couponLines.push({
      productId: product.id,
      categoryId: product.categoryId,
      lineTotal: variant.price * row.quantity,
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const method = await findActiveShippingMethod(tx, ctx.input.shippingMethodId);
  if (!method) {
    throw new UserFacingError("روش ارسال انتخاب‌شده در دسترس نیست.");
  }

  // 🔴 سمت سرور: روشی که آدرس لازم دارد بدون آدرس رد می‌شود؛ روش بدون آدرس
  // (تحویل حضوری) آدرس ذخیره نمی‌کند (حتی اگر کلاینت آدرس فرستاده باشد)
  let address: Awaited<ReturnType<typeof findUserAddress>> = null;
  if (method.requiresAddress) {
    if (!ctx.input.addressId) {
      throw new UserFacingError("آدرس ارسال را انتخاب کنید.");
    }
    address = await findUserAddress(ctx.input.addressId, ctx.userId, tx);
    if (!address) {
      throw new UserFacingError(
        "آدرس انتخاب‌شده پیدا نشد. آدرس را دوباره انتخاب کنید.",
      );
    }
    if (!isServedLocation(address.province, address.city)) {
      throw new UserFacingError(OUT_OF_AREA_MESSAGE);
    }
    if (!isShippingAvailableIn(method.provinces, address.province)) {
      throw new UserFacingError(
        `«${method.name}» به آدرس انتخاب‌شده ارسال ندارد.`,
      );
    }
  }

  // 🔴 سمت سرور: سفارش دارای خدمت بدون پذیرش شرایط رد می‌شود؛ متن پذیرفته‌شده
  // عیناً (شرایط همه‌ی محصولات خدمت، بدون تکرار) ذخیره می‌شود
  let serviceTermsSnapshot: string | null = null;
  if (serviceLines.some((line) => line.kind === "SERVICE")) {
    if (!ctx.input.acceptServiceTerms) {
      throw new UserFacingError(SERVICE_TERMS_REQUIRED_MESSAGE);
    }
    const defaultTerms = await readServiceDefaultTerms(tx);
    serviceTermsSnapshot = collectServiceTerms(
      serviceLines.map((line) => ({
        ...line,
        terms: resolveServiceTerms(
          { kind: line.kind, serviceTerms: line.terms },
          defaultTerms,
        ),
      })),
    );
  }

  // ۳) اعتبارسنجی مجدد کوپن داخل تراکنش
  const couponCode = (await findCartCoupon(tx, ctx.cartId))?.couponCode ?? null;
  const coupon = couponCode
    ? await evaluateCoupon({
        code: couponCode,
        userId: ctx.userId,
        lines: couponLines,
        shippingTotal: null,
        now: ctx.now,
        client: tx,
      })
    : null;
  if (coupon && !coupon.ok) throw new UserFacingError(coupon.message);

  const pricing: OrderPricing = priceOrder({
    subtotal,
    itemsDiscount: coupon?.ok ? coupon.discount : 0,
    freeShippingCoupon: coupon?.ok ? coupon.freeShipping : false,
    shipping: method,
    itemCount,
  });
  if (pricing.grandTotal !== ctx.input.expectedGrandTotal) {
    throw new UserFacingError(PRICE_CHANGED_MESSAGE);
  }
  // کدی که برای این سفارش تخفیفی ندارد ثبت نمی‌شود تا سهمیه‌ی کاربر هدر نرود
  const applied = coupon?.ok && pricing.discountTotal > 0 ? coupon : null;

  // ۴) سفارش + اقلام (اسنپ‌شات کامل)
  const numberPrefix = await readOrderNumberPrefix(tx);
  const prefix = orderNumberPrefix(ctx.now, numberPrefix);
  const sequence = await nextOrderSequence(tx, prefix);
  const order = await createOrderRecord(
    tx,
    {
      orderNumber: formatOrderNumber(ctx.now, sequence, numberPrefix),
      userId: ctx.userId,
      ...pricing,
      couponId: applied?.couponId ?? null,
      couponCode: applied?.code ?? null,
      shippingMethodName: method.name,
      shippingPayOnDelivery: method.payOnDelivery,
      shippingAddressSnapshot: address
        ? {
            receiverName: address.receiverName,
            receiverPhone: address.receiverPhone,
            province: address.province,
            city: address.city,
            postalCode: address.postalCode,
            line: address.line,
          }
        : null,
      serviceTermsAcceptedAt: serviceTermsSnapshot ? ctx.now : null,
      serviceTermsSnapshot,
      customerNote: ctx.input.customerNote,
    },
    items,
  );

  // ۵) CouponRedemption + افزایش اتمی usedCount
  if (applied) {
    const claim = await claimCouponUse(tx, applied.couponId);
    if (!claim) throw new UserFacingError(TOTAL_LIMIT_MESSAGE);
    // پس از UPDATE، redemptionهای commit‌شده‌ی تراکنش‌های هم‌زمان دیده می‌شوند
    if (claim.usageLimitPerUser !== null) {
      const used = await countUserRedemptions(applied.couponId, ctx.userId, tx);
      if (used >= claim.usageLimitPerUser) {
        throw new UserFacingError(userLimitMessage(claim.usageLimitPerUser));
      }
    }
    await createCouponRedemption(tx, {
      couponId: applied.couponId,
      userId: ctx.userId,
      orderId: order.id,
      discountAmount: pricing.discountTotal,
    });
  }

  // ۶) پرداخت (کارت به کارت، در انتظار رسید — فاز ۹)
  await createPendingPayment(tx, order.id, pricing.grandTotal);

  // ۷) خالی کردن سبد؛ اگر تراکنش دیگری همین اقلام را مصرف کرده، کل سفارش برمی‌گردد
  const consumed = await consumeCart(
    tx,
    ctx.cartId,
    rows.map((row) => row.id),
  );
  if (consumed !== rows.length) throw new UserFacingError(CART_CHANGED_MESSAGE);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    grandTotal: order.grandTotal,
  };
}

function isOrderNumberCollision(error: unknown): boolean {
  return getUniqueViolationTarget(error)?.includes("orderNumber") ?? false;
}

export async function createOrder(
  owner: CartOwner & { userId: string },
  input: PlaceOrderInput,
): Promise<PlacedOrder> {
  // پاک‌سازی سبد پیش از تراکنش: اقلام غیرفعال حذف و تعدادها اصلاح می‌شوند؛
  // اگر چیزی تغییر کرد، مشتری باید خلاصه‌ی تازه را ببیند
  const view = await getCartView(owner);
  if (view.notices.length > 0) {
    throw new UserFacingError(
      `${view.notices.join(" ")} لطفاً سفارش را دوباره بررسی کنید.`,
    );
  }
  const cart = await resolveCart(owner);
  if (!cart || view.lines.length === 0) {
    throw new UserFacingError(EMPTY_CART_MESSAGE);
  }

  for (let attempt = 1; ; attempt++) {
    try {
      const placed = await db.$transaction(
        (tx) =>
          placeOrderTx(tx, {
            userId: owner.userId,
            cartId: cart.id,
            input,
            now: new Date(),
          }),
        { maxWait: 10_000, timeout: 20_000 },
      );
      await publishOrderEvent("ORDER_PLACED", placed.orderId);
      return placed;
    } catch (error) {
      if (attempt < ORDER_NUMBER_ATTEMPTS && isOrderNumberCollision(error)) {
        continue;
      }
      throw error;
    }
  }
}
