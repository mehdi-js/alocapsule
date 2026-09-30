import {
  calculateDiscount,
  type CouponErrorCode,
  type CouponLine,
  type CouponRule,
  describeCoupon,
  isValidCouponCode,
  normalizeCouponCode,
  validateCoupon,
} from "@/lib/coupon";
import { db, type DbClient } from "@/lib/db";
import {
  countUserRedemptions,
  type CouponWithScope,
  findCategoryTree,
  findCouponByCode,
  userHasPaidOrder,
} from "@/server/repositories/coupon.repository";

/** دسته‌های انتخابی + همه‌ی زیردسته‌هایشان (کد روی زیردسته‌ها هم اعمال شود) */
export function expandCategoryIds(
  selected: string[],
  tree: { id: string; parentId: string | null }[],
): string[] {
  const result = new Set(selected);
  let added = true;
  while (added) {
    added = false;
    for (const category of tree) {
      if (
        category.parentId &&
        result.has(category.parentId) &&
        !result.has(category.id)
      ) {
        result.add(category.id);
        added = true;
      }
    }
  }
  return [...result];
}

async function toRule(
  coupon: CouponWithScope,
  client: DbClient,
): Promise<CouponRule> {
  const categoryIds =
    coupon.scope === "CATEGORY"
      ? expandCategoryIds(
          coupon.categories.map((item) => item.categoryId),
          await findCategoryTree(client),
        )
      : [];
  return {
    type: coupon.type,
    value: coupon.value,
    maxDiscountAmount: coupon.maxDiscountAmount,
    minOrderAmount: coupon.minOrderAmount,
    scope: coupon.scope,
    usageLimitTotal: coupon.usageLimitTotal,
    usageLimitPerUser: coupon.usageLimitPerUser,
    usedCount: coupon.usedCount,
    firstOrderOnly: coupon.firstOrderOnly,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    isActive: coupon.isActive,
    categoryIds,
    productIds: coupon.products.map((item) => item.productId),
  };
}

export type CouponEvaluation =
  | {
      ok: true;
      couponId: string;
      code: string;
      title: string;
      description: string;
      discount: number;
      freeShipping: boolean;
    }
  | { ok: false; code: string; errorCode: CouponErrorCode; message: string };

/**
 * اعتبارسنجی کامل (بند ۷.۳) + محاسبه‌ی تخفیف. در سبد با `shippingTotal = null`
 * صدا زده می‌شود و داخل تراکنش ثبت سفارش با کلاینت همان تراکنش (`client`).
 */
export async function evaluateCoupon(params: {
  code: string;
  userId: string;
  lines: CouponLine[];
  shippingTotal: number | null;
  now?: Date;
  client?: DbClient;
}): Promise<CouponEvaluation> {
  const client = params.client ?? db;
  const code = normalizeCouponCode(params.code);
  const coupon = isValidCouponCode(code)
    ? await findCouponByCode(code, client)
    : null;
  const rule = coupon ? await toRule(coupon, client) : null;

  const [userUsageCount, hasPaidOrder] = coupon
    ? await Promise.all([
        countUserRedemptions(coupon.id, params.userId, client),
        rule?.firstOrderOnly ? userHasPaidOrder(params.userId, client) : false,
      ])
    : [0, false];

  const validation = validateCoupon(rule, {
    now: params.now ?? new Date(),
    lines: params.lines,
    userUsageCount,
    userHasPaidOrder: hasPaidOrder,
  });
  if (!validation.ok || !coupon || !rule) {
    return {
      ok: false,
      code,
      errorCode: validation.ok ? "NOT_FOUND" : validation.code,
      message: validation.ok ? "کد تخفیف معتبر نیست." : validation.message,
    };
  }

  const subtotal = params.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = calculateDiscount(
    rule,
    validation.eligibleSubtotal,
    subtotal,
    params.shippingTotal,
  );
  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: describeCoupon(rule),
    discount: discount.amount,
    freeShipping: discount.freeShipping,
  };
}

/** کد تخفیفِ ثبت‌شده روی سبد؛ در هر بار خواندن سبد دوباره اعتبارسنجی می‌شود */
export interface CartCouponDto {
  code: string;
  title: string | null;
  description: string | null;
  discount: number;
  freeShipping: boolean;
  /** اگر کد دیگر معتبر نیست (مثلاً سبد زیر حداقل رفت)، دلیلش */
  error: string | null;
}

/** اعتبارسنجی کدِ ثبت‌شده روی سبد (هزینه‌ی ارسال هنوز معلوم نیست) */
export async function evaluateCartCoupon(
  code: string,
  userId: string | null,
  lines: CouponLine[],
): Promise<CartCouponDto> {
  const invalid = (message: string): CartCouponDto => ({
    code,
    title: null,
    description: null,
    discount: 0,
    freeShipping: false,
    error: message,
  });
  if (!userId) return invalid("برای استفاده از کد تخفیف وارد حساب خود شوید.");

  const result = await evaluateCoupon({
    code,
    userId,
    lines,
    shippingTotal: null,
  });
  if (!result.ok) return invalid(result.message);
  return {
    code: result.code,
    title: result.title,
    description: result.description,
    discount: result.discount,
    freeShipping: result.freeShipping,
    error: null,
  };
}
