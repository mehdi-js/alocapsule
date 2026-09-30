import { Prisma, type ProductKind, type ProductUnit } from "@prisma/client";

import { BUSINESS_KEYS, parseBusinessSettings } from "@/lib/business-settings";
import { db, type DbClient } from "@/lib/db";
import {
  ORDER_NUMBER_PREFIX_KEY,
  parseOrderNumberPrefix,
} from "@/lib/order-number";

/**
 * مخزن ثبت سفارش. همه‌ی نوشتن‌ها با کلاینت تراکنش `createOrder()` انجام می‌شوند.
 * 🔴 هیچ قفل ردیف یا کسر موجودی روی محصول/متغیر وجود ندارد (بند ۷.۱ سند).
 */

/** اقلام سبد با وضعیت فعلی محصول/متغیر، برای محاسبه‌ی مجدد قیمت */
export function findCheckoutItems(tx: DbClient, cartId: string) {
  return tx.cartItem.findMany({
    where: { cartId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      quantity: true,
      variant: {
        select: {
          id: true,
          price: true,
          unitValue: true,
          title: true,
          isActive: true,
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              categoryId: true,
              isActive: true,
              kind: true,
              pricingMode: true,
              serviceTerms: true,
            },
          },
        },
      },
    },
  });
}

export function findCartCoupon(tx: DbClient, cartId: string) {
  return tx.cart.findUnique({
    where: { id: cartId },
    select: { couponCode: true },
  });
}

export function findActiveShippingMethod(tx: DbClient, id: string) {
  return tx.shippingMethod.findFirst({ where: { id, isActive: true } });
}

/** متن پیش‌فرض شرایط خدمت (`service.defaultTerms`)؛ نبود/نامعتبر ⇒ پیش‌فرض کد */
export async function readServiceDefaultTerms(tx: DbClient): Promise<string> {
  const row = await tx.setting.findUnique({
    where: { key: BUSINESS_KEYS.serviceDefaultTerms },
  });
  return parseBusinessSettings(
    new Map([[BUSINESS_KEYS.serviceDefaultTerms, row?.value]]),
  ).serviceDefaultTerms;
}

/** پیشوند شماره‌ی سفارش از `Setting` (`order.numberPrefix`)؛ نبود/نامعتبر ⇒ پیش‌فرض */
export async function readOrderNumberPrefix(tx: DbClient): Promise<string> {
  const row = await tx.setting.findUnique({
    where: { key: ORDER_NUMBER_PREFIX_KEY },
  });
  return parseOrderNumberPrefix(row?.value);
}

/** کلید قفل مشورتی شماره‌گذاری سفارش (فقط همین بخش، نه ردیف محصول) */
const ORDER_NUMBER_LOCK = "order-number";

/**
 * ردیف بعدی روز (شماره‌ها با `prefix` شروع می‌شوند؛ شماره‌ی سفارش حذف‌شده
 * هرگز دوباره داده نمی‌شود). قفل مشورتیِ سطح تراکنش
 * فقط شماره‌گذاری تراکنش‌های هم‌زمان را پشت‌سرهم می‌کند تا دو سفارش یک شماره
 * نگیرند؛ با commit یا rollback خودکار آزاد می‌شود.
 */
export async function nextOrderSequence(
  tx: DbClient,
  prefix: string,
): Promise<number> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ORDER_NUMBER_LOCK}))`;
  // شماره‌ی سفارش‌های حذف‌شده (در AuditLog) هم حساب می‌شود تا دوباره استفاده نشود
  const rows = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(substring(number FROM char_length(${prefix}) + 1) AS INTEGER)) AS max
    FROM (
      SELECT "orderNumber" AS number FROM "Order"
      WHERE "orderNumber" LIKE ${`${prefix}%`}
      UNION ALL
      SELECT "metadata"->>'orderNumber' FROM "AuditLog"
      WHERE "action" = 'order.deleted'
        AND "metadata"->>'orderNumber' LIKE ${`${prefix}%`}
    ) AS numbers
  `;
  return (rows[0]?.max ?? 0) + 1;
}

export interface OrderItemSnapshot {
  variantId: string;
  productId: string;
  productName: string;
  variantTitle: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  unitValueSnapshot: number;
  unitSnapshot: ProductUnit;
  /** نوع محصول در لحظه‌ی ثبت؛ خالی ⇒ PHYSICAL (پیش‌فرض دیتابیس) */
  productKindSnapshot?: ProductKind;
}

export interface OrderRecordData {
  orderNumber: string;
  userId: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  couponId: string | null;
  couponCode: string | null;
  shippingMethodName: string;
  shippingPayOnDelivery: boolean;
  /** خالی برای «تحویل حضوری» (روش ارسال بدون آدرس) */
  shippingAddressSnapshot: Prisma.InputJsonObject | null;
  /** فقط برای سفارش دارای آیتم خدمت */
  serviceTermsAcceptedAt?: Date | null;
  serviceTermsSnapshot?: string | null;
  customerNote: string | null;
}

/** سفارش + اقلام (اسنپ‌شات کامل) + اولین ردیف تاریخچه‌ی وضعیت */
export function createOrderRecord(
  tx: DbClient,
  data: OrderRecordData,
  items: OrderItemSnapshot[],
) {
  const { shippingAddressSnapshot, ...rest } = data;
  return tx.order.create({
    data: {
      ...rest,
      // `null` ⇒ NULL در دیتابیس (نه JSON null)
      shippingAddressSnapshot: shippingAddressSnapshot ?? Prisma.DbNull,
      status: "PENDING_PAYMENT",
      items: { create: items },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: "PENDING_PAYMENT",
          changedByUserId: data.userId,
        },
      },
    },
    select: { id: true, orderNumber: true, grandTotal: true },
  });
}

/**
 * مصرف اتمی یک بار از ظرفیت کد: شرط سقف کل داخل خود UPDATE است، پس از دو
 * تراکنش هم‌زمان فقط یکی موفق می‌شود. خروجی: سقف هر کاربر، یا `null` اگر
 * ظرفیت تمام شده یا کد غیرفعال شده است.
 */
export async function claimCouponUse(
  tx: DbClient,
  couponId: string,
): Promise<{ usageLimitPerUser: number | null } | null> {
  const rows = await tx.$queryRaw<{ usageLimitPerUser: number | null }[]>`
    UPDATE "Coupon"
    SET "usedCount" = "usedCount" + 1
    WHERE "id" = ${couponId}
      AND "isActive" = true
      AND ("usageLimitTotal" IS NULL OR "usedCount" < "usageLimitTotal")
    RETURNING "usageLimitPerUser"
  `;
  return rows[0] ?? null;
}

export function createCouponRedemption(
  tx: DbClient,
  data: {
    couponId: string;
    userId: string;
    orderId: string;
    discountAmount: number;
  },
) {
  return tx.couponRedemption.create({ data });
}

export function createPendingPayment(
  tx: DbClient,
  orderId: string,
  amount: number,
) {
  return tx.payment.create({
    data: { orderId, method: "CARD_TO_CARD", amount, status: "PENDING" },
  });
}

/**
 * خالی کردن سبد. تعداد حذف‌شده برگردانده می‌شود: اگر تراکنش هم‌زمانی همین
 * اقلام را قبلاً مصرف کرده باشد (دوبار کلیک «ثبت سفارش»)، کمتر از انتظار است.
 */
export async function consumeCart(
  tx: DbClient,
  cartId: string,
  itemIds: string[],
): Promise<number> {
  const { count } = await tx.cartItem.deleteMany({
    where: { cartId, id: { in: itemIds } },
  });
  await tx.cart.update({ where: { id: cartId }, data: { couponCode: null } });
  return count;
}

/** سفارش برای صفحه‌ی موفقیت؛ فقط اگر متعلق به همین کاربر باشد */
export function findUserOrderByNumber(orderNumber: string, userId: string) {
  return db.order.findFirst({
    where: { orderNumber, userId },
    select: {
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      grandTotal: true,
      couponCode: true,
      shippingMethodName: true,
      shippingPayOnDelivery: true,
      shippingAddressSnapshot: true,
      customerNote: true,
      placedAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productName: true,
          variantTitle: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
      },
    },
  });
}
