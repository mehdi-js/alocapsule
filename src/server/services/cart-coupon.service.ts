import { isValidCouponCode, normalizeCouponCode } from "@/lib/coupon";
import { UserFacingError } from "@/server/errors";
import { setCartCoupon } from "@/server/repositories/cart.repository";

import {
  type CartOwner,
  type CartViewDto,
  getCartView,
  resolveCart,
} from "./cart.service";
import { evaluateCoupon } from "./coupon.service";
import {
  checkRateLimit,
  type RateLimitRule,
  recordRateLimit,
} from "./rate-limit.service";

/** بخش ۸ سند: حداکثر ۲۰ تلاش در ساعت برای هر کاربر و هر IP */
export const COUPON_ATTEMPT_RULE: RateLimitRule = {
  limit: 20,
  windowMs: 60 * 60 * 1000,
};

export const LOGIN_REQUIRED_MESSAGE =
  "برای استفاده از کد تخفیف وارد حساب خود شوید.";

/**
 * اعمال کد روی سبد. هر تلاش (موفق یا ناموفق) شمرده می‌شود تا حدس زدن کدها
 * ممکن نباشد. کد فقط در صورت اعتبار روی سبد ثبت می‌شود.
 */
export async function applyCouponToCart(
  owner: CartOwner,
  rawCode: string,
  ip: string | null,
): Promise<CartViewDto> {
  if (!owner.userId) throw new UserFacingError(LOGIN_REQUIRED_MESSAGE);

  const keys = [
    `coupon:user:${owner.userId}`,
    ...(ip ? [`coupon:ip:${ip}`] : []),
  ];
  const checks = await Promise.all(
    keys.map((key) => checkRateLimit(key, COUPON_ATTEMPT_RULE)),
  );
  if (checks.some((check) => !check.allowed)) {
    throw new UserFacingError(
      "تعداد تلاش‌ها برای کد تخفیف بیش از حد مجاز است. لطفاً ساعتی دیگر دوباره تلاش کنید.",
    );
  }
  await Promise.all(keys.map((key) => recordRateLimit(key)));

  const code = normalizeCouponCode(rawCode);
  if (!isValidCouponCode(code))
    throw new UserFacingError("کد تخفیف معتبر نیست.");

  const view = await getCartView(owner);
  const cart = await resolveCart(owner);
  if (!cart || view.lines.length === 0) {
    throw new UserFacingError("سبد خرید شما خالی است.");
  }

  const result = await evaluateCoupon({
    code,
    userId: owner.userId,
    lines: view.lines,
    shippingTotal: null,
  });
  if (!result.ok) throw new UserFacingError(result.message);

  await setCartCoupon(cart.id, result.code);
  return getCartView(owner);
}

export async function removeCouponFromCart(
  owner: CartOwner,
): Promise<CartViewDto> {
  const cart = await resolveCart(owner);
  if (cart) await setCartCoupon(cart.id, null);
  return getCartView(owner);
}
