/**
 * نمای فقط‌خواندنی متغیرهای `.env` برای پنل مدیریت. مقادیر محرمانه هرگز
 * نمایش داده نمی‌شوند (فقط «تنظیم شده / خالی»). برای هر گروه توضیح داده
 * می‌شود چرا در `.env` است یا کجای پنل قابل تنظیم است.
 */

export interface EnvEntry {
  name: string;
  label: string;
  /** مقدار نمایش داده نمی‌شود */
  secret?: boolean;
  /** اگر در پنل قابل تنظیم است، کجا */
  editableAt?: { label: string; href: string };
}

export interface EnvGroup {
  title: string;
  /** چرا این گروه فقط در `.env` سرور است */
  note: string;
  entries: EnvEntry[];
}

const SMS_CONNECTION = {
  label: "همین صفحه ← اتصال ملی پیامک",
  href: "/admin/settings/server",
};
const SMS_TEXTS = {
  label: "پیامک‌ها ← متن و الگو",
  href: "/admin/notifications/settings",
};

const SMS_PATTERNS: EnvEntry[] = [
  "OTP",
  "ORDER_PLACED",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "ORDER_SHIPPED",
  "ORDER_CANCELED",
  "ADMIN_RECEIPT_SUBMITTED",
  "ADMIN_WALLET_PAID",
].map((type) => ({
  name: `SMS_PATTERN_${type}`,
  label: "شناسه‌ی الگو",
  editableAt: SMS_TEXTS,
}));

export const ENV_GROUPS: EnvGroup[] = [
  {
    title: "پیامک",
    note: "مقادیر پنل بر .env مقدم‌اند؛ .env فقط پشتیبان است.",
    entries: [
      { name: "SMS_PROVIDER", label: "روش ارسال", editableAt: SMS_CONNECTION },
      {
        name: "MELIPAYAMAK_USERNAME",
        label: "نام کاربری ملی پیامک",
        editableAt: SMS_CONNECTION,
      },
      {
        name: "MELIPAYAMAK_PASSWORD",
        label: "رمز / ApiKey ملی پیامک",
        secret: true,
        editableAt: SMS_CONNECTION,
      },
      {
        name: "SMS_ADMIN_PHONE",
        label: "موبایل مدیر",
        editableAt: SMS_TEXTS,
      },
      ...SMS_PATTERNS,
    ],
  },
  {
    title: "دیتابیس و امنیت",
    note: "سایت برای رسیدن به دیتابیس (جایی که تنظیمات پنل ذخیره می‌شود) و امضای نشست‌ها به این‌ها نیاز دارد؛ نمی‌توانند در خود دیتابیس باشند. تغییر AUTH_SECRET همه را از حساب خارج می‌کند.",
    entries: [
      { name: "DATABASE_URL", label: "اتصال دیتابیس", secret: true },
      { name: "AUTH_SECRET", label: "کلید امضای نشست‌ها", secret: true },
      {
        name: "REVALIDATE_SECRET",
        label: "کلید بازسازی کش (سرویس jobs هم از آن استفاده می‌کند)",
        secret: true,
      },
    ],
  },
  {
    title: "دامنه و آدرس سایت",
    note: "هنگام ساخت (build) در کد و تنظیمات Caddy قرار می‌گیرند؛ تغییرشان یعنی ساخت و راه‌اندازی دوباره.",
    entries: [
      { name: "NEXT_PUBLIC_SITE_URL", label: "آدرس کامل سایت" },
      { name: "DOMAIN", label: "دامنه (HTTPS)" },
    ],
  },
  {
    title: "ذخیره‌ی فایل",
    note: "آدرس S3 هنگام ساخت در سیاست امنیتی (CSP) و تنظیم تصاویر قرار می‌گیرد؛ تغییرش ساخت دوباره می‌خواهد.",
    entries: [
      { name: "STORAGE_DRIVER", label: "محل تصاویر (local یا s3)" },
      { name: "S3_ENDPOINT", label: "آدرس S3" },
      { name: "S3_BUCKET", label: "باکت" },
      { name: "S3_ACCESS_KEY", label: "Access key", secret: true },
      { name: "S3_SECRET_KEY", label: "Secret key", secret: true },
      { name: "S3_REGION", label: "منطقه" },
      { name: "S3_PUBLIC_URL", label: "آدرس عمومی تصاویر" },
      { name: "PRIVATE_STORAGE_DIR", label: "پوشه‌ی رسیدهای خصوصی" },
    ],
  },
  {
    title: "بکاپ و نصب",
    note: "سرویس بکاپ و مراحل ساخت/نصب (بیرون از سایت) از این‌ها استفاده می‌کنند.",
    entries: [
      { name: "BACKUP_PATH", label: "محل بکاپ روی سرور" },
      { name: "BACKUP_HOUR", label: "ساعت بکاپ روزانه (تهران)" },
      { name: "BACKUP_RETENTION_DAYS", label: "روزهای نگهداری بکاپ" },
      { name: "ADMIN_SEED_PHONE", label: "موبایل ادمین اولیه (فقط seed)" },
      { name: "NPM_REGISTRY", label: "میرور npm (ساخت)" },
      { name: "PRISMA_ENGINES_MIRROR", label: "میرور Prisma (ساخت)" },
    ],
  },
];

export interface EnvEntryStatus extends EnvEntry {
  isSet: boolean;
  /** فقط برای مقادیر غیرمحرمانه */
  value: string | null;
}

export function getServerEnvStatus(
  env: Record<string, string | undefined> = process.env,
): { title: string; note: string; entries: EnvEntryStatus[] }[] {
  return ENV_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => {
      const raw = env[entry.name]?.trim() ?? "";
      return {
        ...entry,
        isSet: raw !== "",
        value: entry.secret || raw === "" ? null : raw,
      };
    }),
  }));
}
