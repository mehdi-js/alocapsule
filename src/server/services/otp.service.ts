import { logger } from "@/lib/logger";
import {
  buildSmsArgs,
  renderTemplate,
  type VariableKey,
} from "@/lib/notification-templates";
import type { SmsProvider, SmsSendResult } from "@/lib/sms";
import {
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
} from "@/server/auth/otp-crypto";
import {
  claimAttempt,
  createNotificationLog,
  markNotificationFailed,
  markNotificationSent,
} from "@/server/repositories/notification.repository";
import {
  consumeOtp,
  createOtp,
  findActiveOtp,
  incrementOtpAttempts,
  invalidateOtps,
} from "@/server/repositories/otp.repository";
import { findUserByPhone } from "@/server/repositories/user.repository";
import {
  checkRateLimit,
  type RateLimitRule,
  recordRateLimit,
} from "@/server/services/rate-limit.service";
import { getSmsProvider } from "@/server/services/sms-connection.service";
import { resolveSmsTemplate } from "@/server/services/sms-settings.service";

export const OTP_TTL_MS = 2 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** حداکثر ۳ ارسال در ۱۰ دقیقه برای هر شماره و برای هر IP */
export const OTP_SEND_RULE: RateLimitRule = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
};

export type OtpFailureReason =
  "RATE_LIMITED" | "SMS_FAILED" | "CODE_EXPIRED" | "CODE_INVALID" | "LOCKED";

export interface OtpFailure {
  ok: false;
  reason: OtpFailureReason;
  message: string;
  retryAfterSeconds?: number;
}

function fail(
  reason: OtpFailureReason,
  message: string,
  retryAfterSeconds?: number,
): OtpFailure {
  return { ok: false, reason, message, retryAfterSeconds };
}

/** `09123456789` → `0912***6789` برای لاگ */
function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

/**
 * ثبت ارسال کد ورود در لاگ پیامک‌های پنل (با recId ملی پیامک برای پیگیری
 * تحویل). خود کد هرگز ذخیره نمی‌شود. شکست ثبت لاگ، ورود را خراب نمی‌کند.
 */
async function recordOtpSms(
  phone: string,
  pattern: { template: string; variables: VariableKey[]; patternId: string },
  result: SmsSendResult,
): Promise<void> {
  const masked = buildSmsArgs(pattern.variables, { code: "••••••" });
  const payload = {
    args: masked,
    text: renderTemplate(pattern.template, masked),
    patternId: pattern.patternId,
  };
  try {
    const log = await createNotificationLog({
      userId: (await findUserByPhone(phone))?.id ?? null,
      phone,
      type: "OTP",
      orderId: null,
      payload,
    });
    await claimAttempt(log.id, 0);
    if (result.ok) {
      await markNotificationSent(log.id, result.providerMessageId, payload);
    } else {
      await markNotificationFailed(
        log.id,
        `${result.errorCode}: ${result.errorMessage}`,
        payload,
      );
    }
  } catch (error) {
    logger.error("otp_log_failed", error, { phone: maskPhone(phone) });
  }
}

export async function requestOtp(
  { phone, ip }: { phone: string; ip: string | null },
  provider?: SmsProvider,
): Promise<{ ok: true; expiresInSeconds: number } | OtpFailure> {
  const now = new Date();

  const keys = [
    `otp:send:phone:${phone}`,
    ...(ip ? [`otp:send:ip:${ip}`] : []),
  ];
  const checks = await Promise.all(
    keys.map((key) => checkRateLimit(key, OTP_SEND_RULE, now)),
  );
  const blocked = checks.filter((check) => !check.allowed);
  if (blocked.length > 0) {
    const retryAfterSeconds = Math.max(
      ...blocked.map((check) => check.retryAfterSeconds),
    );
    return fail(
      "RATE_LIMITED",
      "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.",
      retryAfterSeconds,
    );
  }

  const code = generateOtpCode();
  await invalidateOtps(phone, now);
  const otp = await createOtp({
    phone,
    codeHash: hashOtp(phone, code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    ip,
  });
  // ارسال‌های ناموفق هم شمرده می‌شوند تا provider خراب دائم فراخوانی نشود.
  await Promise.all(keys.map((key) => recordRateLimit(key)));

  // متن، ترتیب متغیرها و شناسه‌ی الگو از پنل مدیریت (یا .env)
  const pattern = await resolveSmsTemplate("OTP");
  const args = buildSmsArgs(pattern.variables, { code });
  let providerName = provider?.name ?? "unknown";
  let result: SmsSendResult;
  try {
    // تنظیمات اتصال (پنل یا .env) در هر ارسال تازه خوانده می‌شود
    const sender = provider ?? (await getSmsProvider());
    providerName = sender.name;
    result = await sender.sendPattern({
      to: phone,
      patternId: pattern.patternId,
      args,
      previewText: renderTemplate(pattern.template, args),
    });
  } catch (error) {
    // پیکربندی ناقص (مثلاً نبودن نام کاربری ملی پیامک)
    result = {
      ok: false,
      errorCode: "CONFIG",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  await recordOtpSms(phone, pattern, result);

  if (!result.ok) {
    await consumeOtp(otp.id, new Date());
    logger.error("otp_sms_failed", undefined, {
      provider: providerName,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      phone: maskPhone(phone),
    });
    return fail(
      "SMS_FAILED",
      "ارسال پیامک با مشکل مواجه شد. لطفاً دوباره تلاش کنید.",
    );
  }

  return { ok: true, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export async function verifyOtp({
  phone,
  code,
}: {
  phone: string;
  code: string;
}): Promise<{ ok: true } | OtpFailure> {
  const now = new Date();
  const expired = fail(
    "CODE_EXPIRED",
    "کد منقضی شده یا نامعتبر است. کد جدید دریافت کنید.",
  );
  const locked = fail(
    "LOCKED",
    "تعداد تلاش‌های اشتباه بیش از حد مجاز بود. کد جدید دریافت کنید.",
  );

  const otp = await findActiveOtp(phone, now);
  if (!otp) return expired;
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return locked;

  // افزایش اتمی قبل از مقایسه: درخواست‌های هم‌زمان نمی‌توانند از ۵ تلاش بیشتر حدس بزنند.
  const attempts = await incrementOtpAttempts(otp.id);
  if (attempts > OTP_MAX_ATTEMPTS) return locked;

  if (!verifyOtpHash(phone, code, otp.codeHash)) {
    if (attempts >= OTP_MAX_ATTEMPTS) return locked;
    return fail(
      "CODE_INVALID",
      `کد اشتباه است. ${OTP_MAX_ATTEMPTS - attempts} تلاش باقی مانده است.`,
    );
  }

  if (!(await consumeOtp(otp.id, now))) return expired;
  return { ok: true };
}
