import { parseIntegerInput } from "@/lib/utils";
import type { CouponFormInput } from "@/lib/validation/coupon";
import type { CouponEditDto } from "@/server/services/coupon-admin.service";

export type CouponType = "PERCENT" | "FIXED" | "FREE_SHIPPING";

/** مقادیر عددی فرم رشته‌اند (ارقام فارسی و جداکننده پذیرفته می‌شود) */
export interface FormState {
  code: string;
  title: string;
  type: CouponType;
  value: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  scope: "ALL" | "CATEGORY" | "PRODUCT";
  categoryIds: string[];
  productIds: string[];
  usageLimitTotal: string;
  usageLimitPerUser: string;
  firstOrderOnly: boolean;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

const str = (value: number | null) => (value === null ? "" : String(value));

export function initialState(coupon?: CouponEditDto): FormState {
  return {
    code: coupon?.code ?? "",
    title: coupon?.title ?? "",
    type: coupon?.type ?? "PERCENT",
    value: coupon ? str(coupon.value) : "",
    maxDiscountAmount: str(coupon?.maxDiscountAmount ?? null),
    minOrderAmount: str(coupon?.minOrderAmount ?? null),
    scope: coupon?.scope ?? "ALL",
    categoryIds: coupon?.categoryIds ?? [],
    productIds: coupon?.productIds ?? [],
    usageLimitTotal: str(coupon?.usageLimitTotal ?? null),
    usageLimitPerUser: str(coupon?.usageLimitPerUser ?? null),
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    startsAt: coupon?.startsAt ?? "",
    expiresAt: coupon?.expiresAt ?? "",
    isActive: coupon?.isActive ?? true,
  };
}

/** خالی ⇒ null؛ نامعتبر ⇒ NaN تا Zod پیام همان فیلد را بدهد */
function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  return parseIntegerInput(value) ?? Number.NaN;
}

export function toInput(state: FormState): CouponFormInput {
  return {
    ...state,
    value:
      state.type === "FREE_SHIPPING"
        ? 0
        : (parseIntegerInput(state.value) ?? Number.NaN),
    maxDiscountAmount: optionalNumber(state.maxDiscountAmount),
    minOrderAmount: optionalNumber(state.minOrderAmount),
    usageLimitTotal: optionalNumber(state.usageLimitTotal),
    usageLimitPerUser: optionalNumber(state.usageLimitPerUser),
  };
}
