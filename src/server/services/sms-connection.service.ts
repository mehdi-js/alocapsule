import { db } from "@/lib/db";
import { createSmsProvider, type SmsProvider } from "@/lib/sms";
import { MelipayamakProvider } from "@/lib/sms/melipayamak-provider";
import { decryptSecret, encryptSecret } from "@/server/crypto/secret-box";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  getSetting,
  upsertSetting,
} from "@/server/repositories/setting.repository";

/**
 * اتصال پیامک از پنل مدیریت (`sms.connection`): روش ارسال، نام کاربری و
 * رمز/ApiKey ملی پیامک (رمزنگاری‌شده). هر مقدارِ پر در پنل بر `.env` مقدم
 * است؛ خالی ⇒ همان `.env`. هر ارسال تنظیمات تازه را می‌خواند، پس تغییر بدون
 * راه‌اندازی دوباره‌ی سرور اعمال می‌شود.
 */

const KEY = "sms.connection";

export type SmsProviderName = "melipayamak" | "console";

interface StoredConnection {
  /** خالی ⇒ از `.env` */
  provider: SmsProviderName | "";
  username: string;
  /** رمزنگاری‌شده با secret-box؛ `null` ⇒ از `.env` */
  passwordSealed: string | null;
}

const EMPTY: StoredConnection = {
  provider: "",
  username: "",
  passwordSealed: null,
};

async function readStored(): Promise<StoredConnection> {
  const value = await getSetting(KEY);
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY;
  const provider = value.provider;
  return {
    provider:
      provider === "melipayamak" || provider === "console" ? provider : "",
    username: typeof value.username === "string" ? value.username : "",
    passwordSealed:
      typeof value.passwordSealed === "string" ? value.passwordSealed : null,
  };
}

export interface SmsConnectionDto {
  provider: SmsProviderName | "";
  username: string;
  /** رمزی در پنل ذخیره شده (خود رمز هرگز به مرورگر نمی‌رود) */
  hasPassword: boolean;
  /** رمز ذخیره‌شده با AUTH_SECRET فعلی باز نمی‌شود؛ باید دوباره وارد شود */
  passwordUnreadable: boolean;
  env: { provider: string; username: string; hasPassword: boolean };
  /** console فقط در محیط توسعه مجاز است */
  allowConsole: boolean;
}

export async function getSmsConnection(
  env: Record<string, string | undefined> = process.env,
): Promise<SmsConnectionDto> {
  const stored = await readStored();
  return {
    provider: stored.provider,
    username: stored.username,
    hasPassword: stored.passwordSealed !== null,
    passwordUnreadable:
      stored.passwordSealed !== null &&
      decryptSecret(stored.passwordSealed) === null,
    env: {
      provider: env.SMS_PROVIDER ?? "console",
      username: env.MELIPAYAMAK_USERNAME ?? "",
      hasPassword: Boolean(env.MELIPAYAMAK_PASSWORD),
    },
    allowConsole: env.NODE_ENV !== "production",
  };
}

/** `.env` با مقادیر پنل بازنویسی‌شده (ورودی `createSmsProvider`) */
async function effectiveEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<Record<string, string | undefined>> {
  const stored = await readStored();
  const password = stored.passwordSealed
    ? decryptSecret(stored.passwordSealed)
    : null;
  return {
    ...env,
    SMS_PROVIDER: stored.provider || env.SMS_PROVIDER,
    MELIPAYAMAK_USERNAME: stored.username || env.MELIPAYAMAK_USERNAME,
    MELIPAYAMAK_PASSWORD: password ?? env.MELIPAYAMAK_PASSWORD,
  };
}

/** provider فعلی با تنظیمات تازه؛ پیکربندی ناقص ⇒ خطا (فراخواننده مدیریت می‌کند) */
/** نام روش ارسالی که واقعاً استفاده می‌شود (پنل یا .env) */
export async function effectiveProviderName(
  env: Record<string, string | undefined> = process.env,
): Promise<string> {
  return (await readStored()).provider || env.SMS_PROVIDER || "console";
}

export async function getSmsProvider(): Promise<SmsProvider> {
  return createSmsProvider(await effectiveEnv());
}

export async function saveSmsConnection(
  adminId: string,
  input: {
    provider: SmsProviderName | "";
    username: string;
    /** خالی ⇒ رمز قبلی می‌ماند */
    newPassword: string;
    clearPassword: boolean;
  },
): Promise<void> {
  if (input.provider === "console" && process.env.NODE_ENV === "production") {
    throw new UserFacingError("حالت آزمایشی در سایت اصلی مجاز نیست.");
  }
  const stored = await readStored();
  const passwordSealed = input.clearPassword
    ? null
    : input.newPassword
      ? encryptSecret(input.newPassword)
      : stored.passwordSealed;
  await upsertSetting(KEY, {
    provider: input.provider,
    username: input.username,
    passwordSealed,
  });
  // خود رمز هرگز در لاگ نمی‌رود
  await db.$transaction((tx) =>
    createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.sms_connection_updated",
      entityType: "User",
      entityId: adminId,
      metadata: {
        provider: input.provider || "env",
        username: input.username,
        passwordChanged: input.clearPassword || input.newPassword !== "",
      },
    }),
  );
}

/**
 * بررسی اتصال ملی پیامک با اعتبار پنل. رمز خالی ⇒ رمز ذخیره‌شده (یا .env)؛
 * برای آزمودن پیش از ذخیره.
 */
export async function checkMelipayamakCredit(input: {
  username: string;
  password: string;
}): Promise<{ ok: true; credit: number } | { ok: false; message: string }> {
  const env = await effectiveEnv();
  const username = input.username || env.MELIPAYAMAK_USERNAME || "";
  const password = input.password || env.MELIPAYAMAK_PASSWORD || "";
  if (!username || !password) {
    return { ok: false, message: "نام کاربری و رمز/ApiKey را وارد کنید." };
  }
  const result = await new MelipayamakProvider({
    username,
    password,
  }).getCredit();
  return result.ok ? result : { ok: false, message: result.errorMessage };
}

/** وضعیت تحویل یک پیامک ارسال‌شده با اعتبارنامه‌ی فعلی ملی پیامک */
export async function checkMelipayamakDelivery(
  recId: string,
): Promise<{ ok: true; label: string } | { ok: false; message: string }> {
  const env = await effectiveEnv();
  const username = env.MELIPAYAMAK_USERNAME ?? "";
  const password = env.MELIPAYAMAK_PASSWORD ?? "";
  if (!username || !password) {
    return { ok: false, message: "اتصال ملی پیامک تنظیم نشده است." };
  }
  const result = await new MelipayamakProvider({
    username,
    password,
  }).getDelivery(recId);
  return result.ok
    ? { ok: true, label: result.label }
    : { ok: false, message: result.errorMessage };
}
