import type { LoginMethod } from "@prisma/client";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/server/auth/password-hash";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import { revokeOtherUserSessions } from "@/server/repositories/session.repository";
import {
  findUserById,
  findUserByPhone,
  setUserPassword,
} from "@/server/repositories/user.repository";

import { consumeRateLimit, type RateLimitRule } from "./rate-limit.service";

/**
 * نشستی که با کد پیامکی ساخته شده تا این مدت برای تعیین رمز جدید بدون رمز
 * فعلی کافی است («فراموشی رمز»).
 */
export const OTP_RESET_WINDOW_MS = 15 * 60 * 1000;

/** بررسی رمز فعلی هنگام تغییر رمز: ۵ بار در ۱۵ دقیقه برای هر کاربر */
const CURRENT_PASSWORD_RULE: RateLimitRule = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
};

export interface PasswordSession {
  sessionId: string;
  method: LoginMethod;
  createdAt: Date;
}

/**
 * رمز فعلی لازم نیست اگر: کاربر هنوز رمز ندارد (ثبت‌نام) یا همین حالا با
 * کد پیامکی وارد شده است (مالکیت شماره تازه تأیید شده).
 */
export function currentPasswordRequired(
  hasPassword: boolean,
  session: Pick<PasswordSession, "method" | "createdAt">,
  now = new Date(),
): boolean {
  if (!hasPassword) return false;
  const fresh =
    now.getTime() - session.createdAt.getTime() < OTP_RESET_WINDOW_MS;
  return !(session.method === "OTP" && fresh);
}

/**
 * تعیین/تغییر رمز کاربرِ واردشده. بقیه‌ی نشست‌های کاربر باطل می‌شوند و
 * نشست فعلی می‌ماند.
 */
export async function setOwnPassword(params: {
  userId: string;
  session: PasswordSession;
  currentPassword: string | undefined;
  password: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  if (!user || !user.isActive)
    throw new UserFacingError("حساب کاربری یافت نشد.");
  const hasPassword = user.passwordHash !== null;

  if (user.passwordHash && currentPasswordRequired(true, params.session)) {
    const check = await consumeRateLimit(
      `password:current:user:${user.id}`,
      CURRENT_PASSWORD_RULE,
    );
    if (!check.allowed) {
      throw new UserFacingError(
        "تلاش‌های ناموفق زیاد بود. کمی بعد دوباره امتحان کنید یا با کد پیامکی وارد شوید.",
      );
    }
    const valid =
      params.currentPassword !== undefined &&
      (await verifyPassword(params.currentPassword, user.passwordHash));
    if (!valid) throw new UserFacingError("رمز عبور فعلی نادرست است.");
  }

  const passwordHash = await hashPassword(params.password);
  const now = new Date();
  await db.$transaction(async (tx) => {
    await setUserPassword(tx, user.id, passwordHash, now);
    await revokeOtherUserSessions(tx, user.id, params.session.sessionId, now);
    await createAuditLog(tx, {
      actorUserId: user.id,
      action: hasPassword ? "auth.password_changed" : "auth.password_set",
      entityType: "User",
      entityId: user.id,
      metadata: { sessionMethod: params.session.method },
    });
  });
}

/**
 * بازیابی از روی سرور (`npm run user:set-password`) وقتی پیامک در دسترس
 * نیست: رمز را می‌گذارد و همه‌ی نشست‌های کاربر را باطل می‌کند.
 */
export async function resetPasswordByPhone(
  phone: string,
  password: string,
): Promise<{ userId: string; role: string }> {
  const user = await findUserByPhone(phone);
  if (!user) throw new UserFacingError("کاربری با این شماره وجود ندارد.");
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await db.$transaction(async (tx) => {
    await setUserPassword(tx, user.id, passwordHash, now);
    await revokeOtherUserSessions(tx, user.id, null, now);
  });
  return { userId: user.id, role: user.role };
}
