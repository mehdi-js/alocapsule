import type { Prisma } from "@prisma/client";

import {
  ALLOWED_VARIABLES,
  DEFAULT_TEMPLATES,
  DEFAULT_VARIABLES,
  MAX_VARIABLES,
  SMS_TYPES,
  type SmsType,
  templateError,
  type VariableKey,
} from "@/lib/notification-templates";
import { normalizePhone } from "@/lib/phone";
import {
  getSetting,
  upsertSetting,
} from "@/server/repositories/setting.repository";

import { effectiveProviderName } from "./sms-connection.service";

/**
 * تنظیمات پیامک‌ها (از پنل مدیریت، بدون تغییر کد): برای هر پیامک متن
 * (`sms.templates`)، ترتیب متغیرها (`sms.variables`) و شناسه‌ی الگو
 * (`sms.patterns`)، به‌علاوه‌ی شماره‌ی مدیر (`sms.adminPhone`). شناسه‌ی الگو
 * و شماره‌ی مدیر از `.env` هم خوانده می‌شوند و تنظیمات پنل (اگر پر باشد) آن‌ها
 * را بازنویسی می‌کند (بند ۷.۶).
 */

const TEMPLATES_KEY = "sms.templates";
const VARIABLES_KEY = "sms.variables";
const PATTERNS_KEY = "sms.patterns";
const ADMIN_PHONE_KEY = "sms.adminPhone";

const ENV_PATTERN_KEYS: Record<SmsType, string> = {
  OTP: "SMS_PATTERN_OTP",
  ORDER_PLACED: "SMS_PATTERN_ORDER_PLACED",
  PAYMENT_APPROVED: "SMS_PATTERN_PAYMENT_APPROVED",
  PAYMENT_REJECTED: "SMS_PATTERN_PAYMENT_REJECTED",
  ORDER_SHIPPED: "SMS_PATTERN_ORDER_SHIPPED",
  ORDER_CANCELED: "SMS_PATTERN_ORDER_CANCELED",
  ADMIN_RECEIPT_SUBMITTED: "SMS_PATTERN_ADMIN_RECEIPT_SUBMITTED",
  ADMIN_WALLET_PAID: "SMS_PATTERN_ADMIN_WALLET_PAID",
};

type ByType<T> = Record<SmsType, T>;

function readMap<T>(
  value: Prisma.JsonValue | null,
  pick: (entry: Prisma.JsonValue | undefined, type: SmsType) => T | undefined,
): Partial<ByType<T>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Partial<ByType<T>> = {};
  for (const type of SMS_TYPES) {
    const picked = pick(value[type], type);
    if (picked !== undefined) result[type] = picked;
  }
  return result;
}

const readString = (entry: Prisma.JsonValue | undefined) =>
  typeof entry === "string" ? entry : undefined;

/** ترتیب ذخیره‌شده فقط اگر همه‌ی کلیدها برای آن پیامک مجاز باشند */
function readVariables(
  entry: Prisma.JsonValue | undefined,
  type: SmsType,
): VariableKey[] | undefined {
  if (!Array.isArray(entry) || entry.length > MAX_VARIABLES) return undefined;
  const allowed = ALLOWED_VARIABLES[type] as readonly unknown[];
  return entry.every((key) => allowed.includes(key))
    ? (entry as VariableKey[])
    : undefined;
}

export interface SmsTypeSettings {
  type: SmsType;
  template: string;
  variables: VariableKey[];
  /** مقدار ذخیره‌شده در پنل (خالی = از .env) */
  patternOverride: string;
  envPattern: string;
  /** شناسه‌ای که واقعاً استفاده می‌شود */
  effectivePattern: string;
}

export interface SmsSettingsDto {
  provider: string;
  /** شماره‌ی ذخیره‌شده در تنظیمات (خالی = از .env) */
  adminPhoneOverride: string;
  envAdminPhone: string;
  /** گیرنده‌ی پیامک‌های مدیر؛ خالی ⇒ پیامک مدیر فرستاده نمی‌شود */
  effectiveAdminPhone: string;
  types: SmsTypeSettings[];
}

export async function getSmsSettings(
  env: Record<string, string | undefined> = process.env,
): Promise<SmsSettingsDto> {
  const [templates, variables, patterns, adminPhone] = await Promise.all([
    getSetting(TEMPLATES_KEY).then((v) => readMap(v, readString)),
    getSetting(VARIABLES_KEY).then((v) => readMap(v, readVariables)),
    getSetting(PATTERNS_KEY).then((v) => readMap(v, readString)),
    getSetting(ADMIN_PHONE_KEY),
  ]);
  const provider = await effectiveProviderName(env);
  const adminPhoneOverride = typeof adminPhone === "string" ? adminPhone : "";
  const envAdminPhone = normalizePhone(env.SMS_ADMIN_PHONE ?? "") ?? "";
  return {
    provider,
    adminPhoneOverride,
    envAdminPhone,
    effectiveAdminPhone: adminPhoneOverride || envAdminPhone,
    types: SMS_TYPES.map((type) => {
      const envPattern = env[ENV_PATTERN_KEYS[type]]?.trim() ?? "";
      const patternOverride = patterns[type]?.trim() ?? "";
      // متن و ترتیب با هم معنی دارند؛ ناهمخوان ⇒ هر دو پیش‌فرض
      let template = templates[type] || DEFAULT_TEMPLATES[type];
      let order = variables[type] ?? [...DEFAULT_VARIABLES[type]];
      if (templateError(template, order.length)) {
        template = DEFAULT_TEMPLATES[type];
        order = [...DEFAULT_VARIABLES[type]];
      }
      return {
        type,
        template,
        variables: order,
        patternOverride,
        envPattern,
        effectivePattern: patternOverride || envPattern,
      };
    }),
  };
}

/** متن، ترتیب متغیرها و شناسه‌ی الگوی یک پیامک برای ارسال */
export async function resolveSmsTemplate(
  type: SmsType,
): Promise<{ template: string; variables: VariableKey[]; patternId: string }> {
  const settings = await getSmsSettings();
  const entry = settings.types.find((item) => item.type === type);
  return {
    template: entry?.template ?? DEFAULT_TEMPLATES[type],
    variables: entry?.variables ?? [...DEFAULT_VARIABLES[type]],
    patternId: entry?.effectivePattern ?? "",
  };
}

/** گیرنده‌ی پیامک‌های مدیر (خالی ⇒ ارسال نمی‌شود) */
export async function resolveAdminPhone(): Promise<string> {
  return (await getSmsSettings()).effectiveAdminPhone;
}

export async function saveSmsSettings(input: {
  templates: ByType<string>;
  variables: ByType<VariableKey[]>;
  patterns: ByType<string>;
  adminPhone: string;
}): Promise<void> {
  await Promise.all([
    upsertSetting(TEMPLATES_KEY, input.templates),
    upsertSetting(VARIABLES_KEY, input.variables),
    upsertSetting(PATTERNS_KEY, input.patterns),
    upsertSetting(ADMIN_PHONE_KEY, input.adminPhone),
  ]);
}
