import type { SmsProvider } from "@/lib/sms";
import { toPersianDigits } from "@/lib/utils";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password-hash";
import { createSession } from "@/server/auth/session";
import {
  findOrCreateUserByPhone,
  findUserByPhone,
} from "@/server/repositories/user.repository";

import { type OtpFailure, requestOtp, verifyOtp } from "./otp.service";
import {
  checkRateLimit,
  consumeRateLimit,
  type RateLimitRule,
  recordRateLimit,
} from "./rate-limit.service";

type SessionIssued = {
  ok: true;
  token: string;
  expiresAt: Date;
  userId: string;
};

type Inactive = { ok: false; reason: "USER_INACTIVE"; message: string };

const INACTIVE: Inactive = {
  ok: false,
  reason: "USER_INACTIVE",
  message: "حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید.",
};

// ───────── شروع ورود: انتخاب روش ─────────

/** بررسی شماره‌ها در صفحه‌ی ورود: ۳۰ بار در ۱۰ دقیقه برای هر IP */
export const LOGIN_LOOKUP_RULE: RateLimitRule = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

export type StartLoginResult =
  | { ok: true; method: "PASSWORD" }
  | { ok: true; method: "OTP"; expiresInSeconds: number }
  | OtpFailure
  | { ok: false; reason: "RATE_LIMITED"; message: string };

/**
 * گام اول صفحه‌ی ورود: کاربر رمزدار ⇒ فرم رمز (بدون پیامک)؛ کاربر جدید یا
 * بدون رمز ⇒ همین‌جا کد پیامکی فرستاده می‌شود.
 */
export async function startLogin(
  { phone, ip }: { phone: string; ip: string | null },
  provider?: SmsProvider,
): Promise<StartLoginResult> {
  if (ip) {
    const check = await consumeRateLimit(
      `login:lookup:ip:${ip}`,
      LOGIN_LOOKUP_RULE,
    );
    if (!check.allowed) {
      return {
        ok: false,
        reason: "RATE_LIMITED",
        message:
          "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.",
      };
    }
  }

  const user = await findUserByPhone(phone);
  if (user?.passwordHash) return { ok: true, method: "PASSWORD" };

  const sent = await requestOtp({ phone, ip }, provider);
  if (!sent.ok) return sent;
  return { ok: true, method: "OTP", expiresInSeconds: sent.expiresInSeconds };
}

// ───────── ورود با کد پیامکی ─────────

export type OtpLoginResult =
  (SessionIssued & { needsPassword: boolean }) | OtpFailure | Inactive;

/** تأیید OTP، ساخت خودکار کاربر در اولین ورود، و ساخت Session. */
export async function loginWithOtp(params: {
  phone: string;
  code: string;
  userAgent: string | null;
}): Promise<OtpLoginResult> {
  const verified = await verifyOtp(params);
  if (!verified.ok) return verified;

  const user = await findOrCreateUserByPhone(params.phone);
  if (!user.isActive) return INACTIVE;

  const session = await createSession({
    userId: user.id,
    role: user.role,
    method: "OTP",
    userAgent: params.userAgent,
  });
  return {
    ok: true,
    ...session,
    userId: user.id,
    needsPassword: user.passwordHash === null,
  };
}

// ───────── ورود با رمز عبور ─────────

/** تلاش ناموفق رمز: ۵ بار در ۱۵ دقیقه برای هر شماره، ۲۰ بار برای هر IP */
export const PASSWORD_FAILURE_RULES = {
  phone: { limit: 5, windowMs: 15 * 60 * 1000 },
  ip: { limit: 20, windowMs: 15 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

export type PasswordLoginResult =
  | SessionIssued
  | Inactive
  | {
      ok: false;
      reason: "INVALID_CREDENTIALS" | "RATE_LIMITED";
      message: string;
    };

export async function loginWithPassword(params: {
  phone: string;
  password: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<PasswordLoginResult> {
  const now = new Date();
  const limits = [
    {
      key: `login:password:phone:${params.phone}`,
      rule: PASSWORD_FAILURE_RULES.phone,
    },
    ...(params.ip
      ? [
          {
            key: `login:password:ip:${params.ip}`,
            rule: PASSWORD_FAILURE_RULES.ip,
          },
        ]
      : []),
  ];
  const checks = await Promise.all(
    limits.map(({ key, rule }) => checkRateLimit(key, rule, now)),
  );
  const blocked = checks.filter((check) => !check.allowed);
  if (blocked.length > 0) {
    const minutes = Math.ceil(
      Math.max(...blocked.map((check) => check.retryAfterSeconds)) / 60,
    );
    return {
      ok: false,
      reason: "RATE_LIMITED",
      message: `تلاش‌های ناموفق زیاد بود. ${toPersianDigits(minutes)} دقیقه‌ی دیگر دوباره امتحان کنید یا با کد پیامکی وارد شوید.`,
    };
  }

  const user = await findUserByPhone(params.phone);
  const valid = user?.passwordHash
    ? await verifyPassword(params.password, user.passwordHash)
    : (await burnPasswordCheck(params.password), false);

  if (!user || !valid) {
    await Promise.all(limits.map(({ key }) => recordRateLimit(key)));
    return {
      ok: false,
      reason: "INVALID_CREDENTIALS",
      message: "شماره‌ی موبایل یا رمز عبور نادرست است.",
    };
  }
  if (!user.isActive) return INACTIVE;

  const session = await createSession({
    userId: user.id,
    role: user.role,
    method: "PASSWORD",
    userAgent: params.userAgent,
  });
  return { ok: true, ...session, userId: user.id };
}
