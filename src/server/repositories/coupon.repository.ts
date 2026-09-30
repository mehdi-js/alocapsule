import type { Prisma } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";

const withScope = {
  categories: { select: { categoryId: true } },
  products: { select: { productId: true } },
} satisfies Prisma.CouponInclude;

export type CouponWithScope = Prisma.CouponGetPayload<{
  include: typeof withScope;
}>;

/** `code` باید قبلاً نرمال شده باشد (حروف بزرگ لاتین، بدون فاصله). */
export function findCouponByCode(
  code: string,
  client: DbClient = db,
): Promise<CouponWithScope | null> {
  return client.coupon.findUnique({ where: { code }, include: withScope });
}

export function findCouponById(id: string): Promise<CouponWithScope | null> {
  return db.coupon.findUnique({ where: { id }, include: withScope });
}

export function countUserRedemptions(
  couponId: string,
  userId: string,
  client: DbClient = db,
) {
  return client.couponRedemption.count({ where: { couponId, userId } });
}

/** «سفارش پرداخت‌شده» = سفارشی که `paidAt` دارد (تأیید پرداخت در فاز ۹) */
export async function userHasPaidOrder(
  userId: string,
  client: DbClient = db,
): Promise<boolean> {
  const count = await client.order.count({
    where: { userId, paidAt: { not: null } },
  });
  return count > 0;
}

/** همه‌ی دسته‌ها برای گسترش دامنه‌ی کد به زیردسته‌ها */
export function findCategoryTree(client: DbClient = db) {
  return client.category.findMany({ select: { id: true, parentId: true } });
}

// ───────── ادمین ─────────

export async function listCouponsForAdmin() {
  return db.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { redemptions: true } } },
  });
}

export async function couponCodeExists(code: string, excludeId?: string) {
  const found = await db.coupon.findFirst({
    where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

export interface CouponWriteData {
  code: string;
  title: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  scope: "ALL" | "CATEGORY" | "PRODUCT";
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  firstOrderOnly: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}

function scopeRelations(categoryIds: string[], productIds: string[]) {
  return {
    categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    products: { create: productIds.map((productId) => ({ productId })) },
  };
}

export function createCouponRecord(
  data: CouponWriteData & { createdByUserId: string },
  categoryIds: string[],
  productIds: string[],
) {
  return db.coupon.create({
    data: { ...data, ...scopeRelations(categoryIds, productIds) },
    select: { id: true },
  });
}

/** ویرایش + جایگزینی کامل دسته‌ها/محصولات مشمول در یک تراکنش */
export function updateCouponRecord(
  id: string,
  data: CouponWriteData,
  categoryIds: string[],
  productIds: string[],
) {
  return db.$transaction(async (tx) => {
    await tx.couponCategory.deleteMany({ where: { couponId: id } });
    await tx.couponProduct.deleteMany({ where: { couponId: id } });
    await tx.coupon.update({
      where: { id },
      data: { ...data, ...scopeRelations(categoryIds, productIds) },
    });
  });
}

export function setCouponActive(id: string, isActive: boolean) {
  return db.coupon.update({ where: { id }, data: { isActive } });
}

export function deleteCouponRecord(id: string) {
  return db.coupon.delete({ where: { id } });
}

/** گزارش استفاده: جمع تخفیف و آخرین استفاده‌ها */
export async function findCouponUsage(couponId: string, take = 200) {
  const [aggregate, redemptions] = await Promise.all([
    db.couponRedemption.aggregate({
      where: { couponId },
      _sum: { discountAmount: true },
      _count: { _all: true },
    }),
    db.couponRedemption.findMany({
      where: { couponId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        discountAmount: true,
        createdAt: true,
        user: { select: { phone: true, fullName: true } },
        order: {
          select: { orderNumber: true, status: true, grandTotal: true },
        },
      },
    }),
  ]);
  return {
    count: aggregate._count._all,
    totalDiscount: aggregate._sum.discountAmount ?? 0,
    redemptions,
  };
}

/** انتخاب‌گرهای فرم کد: دسته‌ها و محصولات (فعال و غیرفعال) */
export function findScopeOptions() {
  return Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
}
