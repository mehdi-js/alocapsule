import { DEFAULT_ORDER_NUMBER_PREFIX } from "@/lib/order-number";
import type { OrderNotificationType } from "@/lib/order-status";
import { SITE } from "@/lib/site-content";
import { sanitizeSmsArg } from "@/lib/sms/sanitize";

/**
 * پیامک‌های الگویی (بند ۷.۶): متن واقعی در پنل ملی پیامک (وب‌سرویس خدماتی
 * اشتراکی) ثبت و تأیید می‌شود و سایت فقط **مقادیر** متغیرها را به ترتیب
 * می‌فرستد. متن و ترتیب متغیرها از پنل مدیریت قابل تغییر است؛ این فایل
 * پیش‌فرض‌ها، فهرست متغیرهای مجاز و ساخت مقادیر را نگه می‌دارد.
 * شماره‌گذاری متغیرها مثل ملی پیامک از `{0}` است.
 */

/** همه‌ی پیامک‌های سایت: کد ورود + رویدادهای سفارش */
export type SmsType = "OTP" | OrderNotificationType;

export const NOTIFICATION_TYPES: readonly OrderNotificationType[] = [
  "ORDER_PLACED",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "ORDER_SHIPPED",
  "ORDER_CANCELED",
  "ADMIN_RECEIPT_SUBMITTED",
  "ADMIN_WALLET_PAID",
];

export const SMS_TYPES: readonly SmsType[] = ["OTP", ...NOTIFICATION_TYPES];

/** پیامک‌هایی که به شماره‌ی مدیر (نه مشتری) می‌روند */
export const ADMIN_NOTIFICATION_TYPES: readonly OrderNotificationType[] = [
  "ADMIN_RECEIPT_SUBMITTED",
  "ADMIN_WALLET_PAID",
];

export function isAdminNotification(type: OrderNotificationType): boolean {
  return ADMIN_NOTIFICATION_TYPES.includes(type);
}

export const SMS_LABELS: Record<SmsType, string> = {
  OTP: "کد ورود",
  ORDER_PLACED: "ثبت سفارش",
  PAYMENT_APPROVED: "تأیید پرداخت",
  PAYMENT_REJECTED: "رد رسید",
  ORDER_SHIPPED: "ارسال سفارش",
  ORDER_CANCELED: "لغو سفارش",
  ADMIN_RECEIPT_SUBMITTED: "مدیر: رسید جدید",
  ADMIN_WALLET_PAID: "مدیر: پرداخت با کیف پول",
};

/** برچسب ردیف‌های لاگ پیامک‌ها (کد ورود + رویدادهای سفارش) */
export const NOTIFICATION_LABELS: Record<SmsType, string> = SMS_LABELS;

// ───────── متغیرها ─────────

export const VARIABLE_KEYS = [
  "code",
  "customerName",
  "customerPhone",
  "orderNumber",
  "amount",
  "trackingCode",
] as const;
export type VariableKey = (typeof VARIABLE_KEYS)[number];

export const VARIABLES: Record<VariableKey, { label: string; sample: string }> =
  {
    code: { label: "کد ورود (۶ رقمی)", sample: "482913" },
    customerName: { label: "نام مشتری", sample: "مریم احمدی" },
    customerPhone: { label: "موبایل مشتری", sample: "09121234567" },
    orderNumber: {
      label: "شماره‌ی سفارش",
      sample: `${DEFAULT_ORDER_NUMBER_PREFIX}-14050701-0001`,
    },
    amount: { label: "مبلغ (تومان)", sample: "357,000" },
    trackingCode: { label: "کد رهگیری", sample: "123456789012" },
  };

const ORDER_BASICS: VariableKey[] = ["customerName", "orderNumber", "amount"];
const ADMIN_BASICS: VariableKey[] = [
  "orderNumber",
  "amount",
  "customerName",
  "customerPhone",
];

/** متغیرهایی که هر پیامک می‌تواند داشته باشد (داده‌ای که آن لحظه موجود است) */
export const ALLOWED_VARIABLES: Record<SmsType, readonly VariableKey[]> = {
  OTP: ["code"],
  ORDER_PLACED: ORDER_BASICS,
  PAYMENT_APPROVED: ORDER_BASICS,
  PAYMENT_REJECTED: ORDER_BASICS,
  ORDER_SHIPPED: [...ORDER_BASICS, "trackingCode"],
  ORDER_CANCELED: ORDER_BASICS,
  ADMIN_RECEIPT_SUBMITTED: ADMIN_BASICS,
  ADMIN_WALLET_PAID: ADMIN_BASICS,
};

/** سقف تعداد متغیر هر پیامک */
export const MAX_VARIABLES = 6;

/** ترتیب پیش‌فرض متغیرها: `{0}`، `{1}`، … */
export const DEFAULT_VARIABLES: Record<SmsType, readonly VariableKey[]> = {
  OTP: ["code"],
  ORDER_PLACED: ["customerName", "orderNumber", "amount"],
  PAYMENT_APPROVED: ["customerName", "orderNumber"],
  PAYMENT_REJECTED: ["customerName", "orderNumber"],
  ORDER_SHIPPED: ["customerName", "orderNumber", "trackingCode"],
  ORDER_CANCELED: ["customerName", "orderNumber"],
  ADMIN_RECEIPT_SUBMITTED: ["orderNumber", "amount", "customerName"],
  ADMIN_WALLET_PAID: ["orderNumber", "amount", "customerName"],
};

/** ملی پیامک درج نشانی سایت در انتهای الگو را اجباری کرده است */
const SITE_HOST = new URL(SITE.url).host;
const BRAND = SITE.name;

export const DEFAULT_TEMPLATES: Record<SmsType, string> = {
  OTP: `کد ورود شما به ${BRAND}: {0}\nاین کد را در اختیار دیگران قرار ندهید.\n${SITE_HOST}`,
  ORDER_PLACED: `{0} عزیز، سفارش {1} به مبلغ {2} تومان در ${BRAND} ثبت شد. لطفاً مبلغ را کارت‌به‌کارت کنید و رسید را در سایت بارگذاری کنید.\n${SITE_HOST}`,
  PAYMENT_APPROVED: `{0} عزیز، پرداخت سفارش {1} تأیید شد و سفارش شما در حال آماده‌سازی است.\n${BRAND}\n${SITE_HOST}`,
  PAYMENT_REJECTED: `{0} عزیز، رسید پرداخت سفارش {1} تأیید نشد. لطفاً از بخش سفارش‌های من رسید صحیح را بارگذاری کنید.\n${BRAND}\n${SITE_HOST}`,
  ORDER_SHIPPED: `{0} عزیز، سفارش {1} ارسال شد.\nکد رهگیری: {2}\n${BRAND}\n${SITE_HOST}`,
  ORDER_CANCELED: `{0} عزیز، سفارش {1} لغو شد. اگر مبلغی پرداخت کرده بودید به کیف پول حساب شما برگشت داده شده است.\n${BRAND}\n${SITE_HOST}`,
  ADMIN_RECEIPT_SUBMITTED: `رسید جدید برای بررسی\nسفارش {0} به مبلغ {1} تومان\nمشتری: {2}\n${SITE_HOST}`,
  ADMIN_WALLET_PAID: `پرداخت با کیف پول\nسفارش {0} به مبلغ {1} تومان آماده‌سازی شود.\nمشتری: {2}\n${SITE_HOST}`,
};

// ───────── ساخت مقادیر ─────────

export type VariableValues = Partial<Record<VariableKey, string | null>>;

export interface NotificationData {
  orderNumber: string;
  grandTotal: number;
  trackingCode: string | null;
  /** نام گیرنده‌ی سفارش (یا نام حساب) */
  customerName: string | null;
  customerPhone: string;
}

/** نام خیلی بلند پیامک را چندبخشی و گران می‌کند */
const MAX_NAME_LENGTH = 30;

/** مقادیر رویداد سفارش؛ مبلغ با ارقام لاتین و کاما (`357,000`) */
export function orderVariableValues(data: NotificationData): VariableValues {
  return {
    customerName:
      data.customerName?.trim().slice(0, MAX_NAME_LENGTH) || "مشتری",
    customerPhone: data.customerPhone,
    orderNumber: data.orderNumber,
    amount: data.grandTotal.toLocaleString("en-US"),
    trackingCode: data.trackingCode ?? "",
  };
}

/** مقادیر به ترتیب تنظیم‌شده، پاک‌سازی‌شده از `;` (جداکننده‌ی ملی پیامک) */
export function buildSmsArgs(
  order: readonly VariableKey[],
  values: VariableValues,
): string[] {
  return order.map((key) => sanitizeSmsArg(values[key] ?? ""));
}

/** جایگذاری `{n}` با مقدار n‌ام از صفر (برای پیش‌نمایش و حالت console) */
export function renderTemplate(template: string, args: string[]): string {
  return template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)];
    return value === undefined ? match : value;
  });
}

/**
 * متن باید دقیقاً همه‌ی متغیرهای `{0}`…`{n-1}` را داشته باشد (n = تعداد
 * متغیرهای تنظیم‌شده) و متغیر اضافه نداشته باشد. خروجی: پیام خطا یا `null`.
 */
export function templateError(template: string, count: number): string | null {
  const last = count - 1;
  const used = new Set(
    [...template.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1])),
  );
  for (const index of used) {
    if (index > last) {
      return count === 0
        ? `این پیامک متغیری ندارد؛ {${index}} را حذف کنید یا متغیر اضافه کنید.`
        : `متغیر {${index}} تعریف نشده است (فقط {0} تا {${last}}).`;
    }
  }
  for (let index = 0; index <= last; index++) {
    if (!used.has(index)) return `متغیر {${index}} در متن استفاده نشده است.`;
  }
  return null;
}
