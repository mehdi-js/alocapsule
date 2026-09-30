import type { CouponScope, CouponType, OrderStatus } from "@prisma/client";

import { describeCoupon } from "@/lib/coupon";
import { toJalaliDateInput } from "@/lib/date";
import type { CouponInput } from "@/lib/validation/coupon";
import {
  getUniqueViolationTarget,
  isRecordNotFound,
  UserFacingError,
} from "@/server/errors";
import {
  couponCodeExists,
  createCouponRecord,
  deleteCouponRecord,
  findCouponById,
  findCouponUsage,
  findScopeOptions,
  listCouponsForAdmin,
  setCouponActive,
  updateCouponRecord,
} from "@/server/repositories/coupon.repository";

export type CouponStatus =
  "active" | "inactive" | "scheduled" | "expired" | "exhausted";

export interface CouponListItem {
  id: string;
  code: string;
  title: string;
  description: string;
  scope: CouponScope;
  usedCount: number;
  usageLimitTotal: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  status: CouponStatus;
}

export function couponStatus(
  coupon: {
    isActive: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
    usedCount: number;
    usageLimitTotal: number | null;
  },
  now = new Date(),
): CouponStatus {
  if (!coupon.isActive) return "inactive";
  if (coupon.expiresAt && now > coupon.expiresAt) return "expired";
  if (
    coupon.usageLimitTotal !== null &&
    coupon.usedCount >= coupon.usageLimitTotal
  ) {
    return "exhausted";
  }
  if (coupon.startsAt && now < coupon.startsAt) return "scheduled";
  return "active";
}

export async function listCoupons(): Promise<CouponListItem[]> {
  const coupons = await listCouponsForAdmin();
  return coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: describeCoupon(coupon),
    scope: coupon.scope,
    usedCount: coupon.usedCount,
    usageLimitTotal: coupon.usageLimitTotal,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    isActive: coupon.isActive,
    status: couponStatus(coupon),
  }));
}

/** مقادیر فرم ویرایش (تاریخ‌ها به‌صورت متن شمسی) */
export interface CouponEditDto {
  id: string;
  code: string;
  title: string;
  type: CouponType;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  scope: CouponScope;
  categoryIds: string[];
  productIds: string[];
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  firstOrderOnly: boolean;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  usedCount: number;
}

export async function getCouponForEdit(
  id: string,
): Promise<CouponEditDto | null> {
  const coupon = await findCouponById(id);
  if (!coupon) return null;
  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    type: coupon.type,
    value: coupon.value,
    maxDiscountAmount: coupon.maxDiscountAmount,
    minOrderAmount: coupon.minOrderAmount,
    scope: coupon.scope,
    categoryIds: coupon.categories.map((item) => item.categoryId),
    productIds: coupon.products.map((item) => item.productId),
    usageLimitTotal: coupon.usageLimitTotal,
    usageLimitPerUser: coupon.usageLimitPerUser,
    firstOrderOnly: coupon.firstOrderOnly,
    startsAt: toJalaliDateInput(coupon.startsAt),
    expiresAt: toJalaliDateInput(coupon.expiresAt),
    isActive: coupon.isActive,
    usedCount: coupon.usedCount,
  };
}

export async function getScopeOptions() {
  const [categories, products] = await findScopeOptions();
  return { categories, products };
}

function splitInput(input: CouponInput) {
  const { categoryIds, productIds, ...data } = input;
  return { data, categoryIds, productIds };
}

const DUPLICATE_CODE = "این کد تخفیف قبلاً ثبت شده است";

function translateConflict(error: unknown): never {
  if (getUniqueViolationTarget(error)?.includes("code")) {
    throw new UserFacingError(DUPLICATE_CODE);
  }
  throw error;
}

export async function createCoupon(
  input: CouponInput,
  adminId: string,
): Promise<{ id: string }> {
  if (await couponCodeExists(input.code))
    throw new UserFacingError(DUPLICATE_CODE);
  const { data, categoryIds, productIds } = splitInput(input);
  try {
    return await createCouponRecord(
      { ...data, createdByUserId: adminId },
      categoryIds,
      productIds,
    );
  } catch (error) {
    return translateConflict(error);
  }
}

export async function updateCoupon(
  id: string,
  input: CouponInput,
): Promise<{ id: string }> {
  if (!(await findCouponById(id)))
    throw new UserFacingError("کد تخفیف یافت نشد");
  if (await couponCodeExists(input.code, id))
    throw new UserFacingError(DUPLICATE_CODE);
  const { data, categoryIds, productIds } = splitInput(input);
  try {
    await updateCouponRecord(id, data, categoryIds, productIds);
  } catch (error) {
    return translateConflict(error);
  }
  return { id };
}

export async function changeCouponActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  try {
    await setCouponActive(id, isActive);
  } catch (error) {
    if (isRecordNotFound(error)) throw new UserFacingError("کد تخفیف یافت نشد");
    throw error;
  }
}

/** کدی که استفاده شده حذف نمی‌شود تا گزارشش از بین نرود؛ باید غیرفعال شود. */
export async function removeCoupon(id: string): Promise<void> {
  const coupon = await findCouponById(id);
  if (!coupon) throw new UserFacingError("کد تخفیف یافت نشد");
  const usage = await findCouponUsage(id, 1);
  if (coupon.usedCount > 0 || usage.count > 0) {
    throw new UserFacingError(
      "این کد در سفارش‌ها استفاده شده و برای حفظ گزارش حذف نمی‌شود؛ آن را غیرفعال کنید.",
    );
  }
  await deleteCouponRecord(id);
}

export interface CouponReport {
  coupon: CouponListItem;
  redemptionCount: number;
  totalDiscount: number;
  redemptions: {
    id: string;
    discountAmount: number;
    createdAt: Date;
    customer: string;
    orderNumber: string;
    orderStatus: OrderStatus;
    grandTotal: number;
  }[];
}

export async function getCouponReport(
  id: string,
): Promise<CouponReport | null> {
  const [coupons, usage] = await Promise.all([
    listCoupons(),
    findCouponUsage(id),
  ]);
  const coupon = coupons.find((item) => item.id === id);
  if (!coupon) return null;
  return {
    coupon,
    redemptionCount: usage.count,
    totalDiscount: usage.totalDiscount,
    redemptions: usage.redemptions.map((row) => ({
      id: row.id,
      discountAmount: row.discountAmount,
      createdAt: row.createdAt,
      customer: row.user.fullName ?? row.user.phone,
      orderNumber: row.order.orderNumber,
      orderStatus: row.order.status,
      grandTotal: row.order.grandTotal,
    })),
  };
}
