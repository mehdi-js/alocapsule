import { formatToman } from "@/lib/money";
import { toLatinDigits, toPersianDigits } from "@/lib/utils";

/**
 * منطق خالص کد تخفیف (بند ۷.۳ سند). بدون دیتابیس، تا هم در سبد و هم داخل
 * تراکنش ثبت سفارش (فاز ۸) یکسان اجرا شود.
 */

export type CouponType = "PERCENT" | "FIXED" | "FREE_SHIPPING";
export type CouponScope = "ALL" | "CATEGORY" | "PRODUCT";

/** تخفیف درصدی به پایین و تا این مضرب گرد می‌شود */
export const PERCENT_ROUNDING = 1000;

const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
/** بدون حروف مبهم (0/O، 1/I/L) */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** نرمال‌سازی (بخش ۵ سند): ارقام فارسی → لاتین، حذف فاصله و نیم‌فاصله، حروف بزرگ */
export function normalizeCouponCode(input: string): string {
  return toLatinDigits(input)
    .replace(/[\s\u200c\u200d]/g, "")
    .toUpperCase();
}

export function isValidCouponCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function generateCouponCode(
  length = 8,
  random: (max: number) => number = (max) => Math.floor(Math.random() * max),
): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  }
  return code;
}

export interface CouponRule {
  type: CouponType;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  scope: CouponScope;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  /** شناسه‌ی دسته‌های مشمول (شامل زیردسته‌ها) — فقط scope=CATEGORY */
  categoryIds: string[];
  /** فقط scope=PRODUCT */
  productIds: string[];
}

export interface CouponLine {
  productId: string;
  categoryId: string;
  lineTotal: number;
}

export interface CouponContext {
  now: Date;
  lines: CouponLine[];
  /** دفعات استفاده‌ی همین کاربر از این کد */
  userUsageCount: number;
  /** آیا کاربر سفارش پرداخت‌شده دارد */
  userHasPaidOrder: boolean;
}

export type CouponErrorCode =
  | "NOT_FOUND"
  | "NOT_STARTED"
  | "EXPIRED"
  | "MIN_ORDER"
  | "TOTAL_LIMIT"
  | "USER_LIMIT"
  | "FIRST_ORDER_ONLY"
  | "NOT_APPLICABLE";

export type CouponValidation =
  | { ok: true; eligibleSubtotal: number }
  | { ok: false; code: CouponErrorCode; message: string };

function fail(code: CouponErrorCode, message: string): CouponValidation {
  return { ok: false, code, message };
}

export function isLineEligible(rule: CouponRule, line: CouponLine): boolean {
  if (rule.scope === "CATEGORY")
    return rule.categoryIds.includes(line.categoryId);
  if (rule.scope === "PRODUCT") return rule.productIds.includes(line.productId);
  return true;
}

export const TOTAL_LIMIT_MESSAGE =
  "ظرفیت استفاده از این کد تخفیف تکمیل شده است.";

export function userLimitMessage(limit: number): string {
  return limit === 1
    ? "شما قبلاً از این کد تخفیف استفاده کرده‌اید."
    : `هر کاربر حداکثر ${toPersianDigits(limit)} بار می‌تواند از این کد استفاده کند.`;
}

/**
 * اعتبارسنجی به ترتیب بند ۷.۳ سند؛ هر شکست پیام فارسیِ مخصوص خودش را دارد.
 * `rule = null` یعنی کد وجود ندارد.
 */
export function validateCoupon(
  rule: CouponRule | null,
  context: CouponContext,
): CouponValidation {
  // ۱) وجود و فعال بودن
  if (!rule || !rule.isActive) return fail("NOT_FOUND", "کد تخفیف معتبر نیست.");

  // ۲) بازه‌ی زمانی
  if (rule.startsAt && context.now < rule.startsAt) {
    return fail("NOT_STARTED", "این کد تخفیف هنوز فعال نشده است.");
  }
  if (rule.expiresAt && context.now > rule.expiresAt) {
    return fail("EXPIRED", "مهلت استفاده از این کد تخفیف تمام شده است.");
  }

  // ۳) حداقل مبلغ سبد
  const subtotal = context.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  if (rule.minOrderAmount !== null && subtotal < rule.minOrderAmount) {
    return fail(
      "MIN_ORDER",
      `این کد برای خرید حداقل ${formatToman(rule.minOrderAmount)} تومان است؛ جمع سبد شما ${formatToman(subtotal)} تومان است.`,
    );
  }

  // ۴) سقف استفاده‌ی کل
  if (rule.usageLimitTotal !== null && rule.usedCount >= rule.usageLimitTotal) {
    return fail("TOTAL_LIMIT", TOTAL_LIMIT_MESSAGE);
  }

  // ۵) سقف استفاده‌ی هر کاربر
  if (
    rule.usageLimitPerUser !== null &&
    context.userUsageCount >= rule.usageLimitPerUser
  ) {
    return fail("USER_LIMIT", userLimitMessage(rule.usageLimitPerUser));
  }

  // ۶) فقط سفارش اول
  if (rule.firstOrderOnly && context.userHasPaidOrder) {
    return fail("FIRST_ORDER_ONLY", "این کد تخفیف فقط برای اولین خرید است.");
  }

  // ۷) دامنه: دست‌کم یک قلم مشمول
  const eligibleSubtotal = context.lines
    .filter((line) => isLineEligible(rule, line))
    .reduce((sum, line) => sum + line.lineTotal, 0);
  if (eligibleSubtotal === 0) {
    return fail(
      "NOT_APPLICABLE",
      "این کد تخفیف شامل هیچ‌کدام از محصولات سبد شما نمی‌شود.",
    );
  }

  return { ok: true, eligibleSubtotal };
}

export interface DiscountResult {
  /** مبلغ تخفیف (تومان) */
  amount: number;
  /** کد ارسال رایگان است (مبلغش با هزینه‌ی ارسال مشخص می‌شود) */
  freeShipping: boolean;
}

/**
 * محاسبه‌ی مبلغ تخفیف. `shippingTotal = null` یعنی هنوز روش ارسال انتخاب
 * نشده (مثلاً در سبد)؛ آن‌گاه تخفیف ارسال رایگان صفر حساب می‌شود.
 * تضمین: ۰ ≤ تخفیف ≤ subtotal + shippingTotal.
 */
export function calculateDiscount(
  rule: Pick<CouponRule, "type" | "value" | "maxDiscountAmount">,
  eligibleSubtotal: number,
  subtotal: number,
  shippingTotal: number | null,
): DiscountResult {
  let amount = 0;
  if (rule.type === "PERCENT") {
    const raw = (eligibleSubtotal * rule.value) / 100;
    const rounded = Math.floor(raw / PERCENT_ROUNDING) * PERCENT_ROUNDING;
    amount = Math.min(
      rounded,
      rule.maxDiscountAmount ?? Number.POSITIVE_INFINITY,
    );
  } else if (rule.type === "FIXED") {
    amount = Math.min(rule.value, eligibleSubtotal);
  } else {
    amount = shippingTotal ?? 0;
  }

  const ceiling = subtotal + (shippingTotal ?? 0);
  return {
    amount: Math.max(0, Math.min(amount, ceiling)),
    freeShipping: rule.type === "FREE_SHIPPING",
  };
}

/** خلاصه‌ی خوانای کد برای ادمین و سبد، مثل «۱۰٪ تا سقف ۱۰۰,۰۰۰ تومان» */
export function describeCoupon(
  rule: Pick<CouponRule, "type" | "value" | "maxDiscountAmount">,
): string {
  if (rule.type === "PERCENT") {
    const base = `${toPersianDigits(rule.value)}٪`;
    return rule.maxDiscountAmount
      ? `${base} تا سقف ${formatToman(rule.maxDiscountAmount)} تومان`
      : base;
  }
  if (rule.type === "FIXED") return `${formatToman(rule.value)} تومان`;
  return "ارسال رایگان";
}
