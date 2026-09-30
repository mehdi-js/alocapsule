import type { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import {
  buildSmsArgs,
  isAdminNotification,
  orderVariableValues,
  renderTemplate,
} from "@/lib/notification-templates";
import type { OrderNotificationType } from "@/lib/order-status";
import type { SmsSendResult } from "@/lib/sms";
import { getUniqueViolationTarget } from "@/server/errors";
import {
  claimAttempt,
  createNotificationLog,
  findNotificationLog,
  findOrderForNotification,
  findRetryableLogs,
  markNotificationFailed,
  markNotificationSent,
} from "@/server/repositories/notification.repository";

import { parseAddressSnapshot } from "./order-query.service";
import { getSmsProvider } from "./sms-connection.service";
import { resolveAdminPhone, resolveSmsTemplate } from "./sms-settings.service";

/**
 * اعلان پیامکی سفارش (بند ۷.۶). قواعد:
 * ۱) همیشه **پس از commit** صدا زده می‌شود (نه داخل تراکنش).
 * ۲) هرگز throw نمی‌کند: شکست پیامک عملیات اصلی را خراب نمی‌کند و فقط در
 *    `NotificationLog` ثبت می‌شود.
 * ۳) ابتدا ردیف لاگ با `unique(orderId, type)` ساخته می‌شود؛ اگر هست، ارسال
 *    دوباره انجام نمی‌شود.
 * ۴) پاسخ ملی پیامک بررسی می‌شود؛ فقط recId معتبر یعنی «ارسال شد».
 */

/** سقف کل تلاش‌ها (اولین ارسال + تلاش‌های job) */
export const MAX_NOTIFICATION_ATTEMPTS = 3;
/** «در انتظار»ی که بیش از این مانده، گیرکرده حساب می‌شود */
const STALE_PENDING_MS = 10 * 60 * 1000;

interface NotificationPayload {
  args: string[];
  text: string;
  patternId: string;
}

function readPayload(value: Prisma.JsonValue): NotificationPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { args, text, patternId } = value;
  if (!Array.isArray(args) || !args.every((a) => typeof a === "string")) {
    return null;
  }
  return {
    args: args as string[],
    text: typeof text === "string" ? text : "",
    patternId: typeof patternId === "string" ? patternId : "",
  };
}

function logError(event: string, error: unknown, extra: object = {}): void {
  logger.error(event, error, { ...extra });
}

/**
 * یک تلاش ارسال. `expectedAttempts` تعداد تلاش‌هایی است که فراخواننده دیده؛
 * اگر در این فاصله کس دیگری نوبت را گرفته باشد، کاری نمی‌کند.
 */
async function deliver(
  logId: string,
  expectedAttempts: number,
): Promise<boolean> {
  if (!(await claimAttempt(logId, expectedAttempts))) return false;
  const log = await findNotificationLog(logId);
  const payload = log ? readPayload(log.payload) : null;
  if (!log || !payload) {
    await markNotificationFailed(
      logId,
      "INVALID_PAYLOAD: داده‌ی پیامک نامعتبر است",
      {},
    );
    return true;
  }

  const { patternId } = await resolveSmsTemplate(log.type);
  const nextPayload = { ...payload, patternId };
  let result: SmsSendResult;
  try {
    result = await (
      await getSmsProvider()
    ).sendPattern({
      to: log.phone,
      patternId,
      args: payload.args,
      previewText: payload.text,
    });
  } catch (error) {
    // پیکربندی نادرست provider (مثلاً نبودن نام کاربری) هم فقط شکست ارسال است
    result = {
      ok: false,
      errorCode: "CONFIG",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  if (result.ok) {
    await markNotificationSent(logId, result.providerMessageId, nextPayload);
  } else {
    await markNotificationFailed(
      logId,
      `${result.errorCode}: ${result.errorMessage}`,
      nextPayload,
    );
  }
  return true;
}

/** ارسال پیامک رویداد سفارش؛ هرگز خطا به بیرون نمی‌دهد. */
export async function sendOrderNotification(
  type: OrderNotificationType,
  orderId: string,
): Promise<void> {
  try {
    const order = await findOrderForNotification(orderId);
    if (!order) return;

    // پیامک مدیر به شماره‌ی تنظیمات؛ اگر تعیین نشده، فرستاده نمی‌شود
    const admin = isAdminNotification(type);
    const phone = admin ? await resolveAdminPhone() : order.user.phone;
    if (!phone) return;

    const { template, variables } = await resolveSmsTemplate(type);
    const args = buildSmsArgs(
      variables,
      orderVariableValues({
        ...order,
        customerName:
          parseAddressSnapshot(order.shippingAddressSnapshot)?.receiverName ??
          order.user.fullName,
        customerPhone: order.user.phone,
      }),
    );
    let logId: string;
    try {
      const log = await createNotificationLog({
        userId: admin ? null : order.userId,
        phone,
        type,
        orderId,
        payload: { args, text: renderTemplate(template, args), patternId: "" },
      });
      logId = log.id;
    } catch (error) {
      // این رویداد قبلاً ثبت (و ارسال یا زمان‌بندی) شده است
      if (getUniqueViolationTarget(error)) return;
      throw error;
    }
    await deliver(logId, 0);
  } catch (error) {
    logError("notification_failed", error, { type, orderId });
  }
}

/** تلاش دوباره‌ی یک پیامک ناموفق (دکمه‌ی ادمین)؛ سقف تلاش رعایت می‌شود */
export async function retryNotification(logId: string): Promise<boolean> {
  const log = await findNotificationLog(logId);
  if (
    !log ||
    log.type === "OTP" ||
    log.status !== "FAILED" ||
    log.attempts >= MAX_NOTIFICATION_ATTEMPTS
  ) {
    return false;
  }
  return deliver(log.id, log.attempts);
}

export interface RetrySummary {
  attempted: number;
  sent: number;
  failed: number;
}

/** job: پیامک‌های ناموفق (و گیرکرده) تا سقف ۳ تلاش دوباره فرستاده می‌شوند */
export async function retryFailedNotifications(
  now: Date = new Date(),
): Promise<RetrySummary> {
  const logs = await findRetryableLogs(
    MAX_NOTIFICATION_ATTEMPTS,
    new Date(now.getTime() - STALE_PENDING_MS),
  );
  const summary: RetrySummary = { attempted: 0, sent: 0, failed: 0 };
  for (const log of logs) {
    try {
      if (!(await deliver(log.id, log.attempts))) continue;
      const after = await findNotificationLog(log.id);
      summary.attempted++;
      if (after?.status === "SENT") summary.sent++;
      else summary.failed++;
    } catch (error) {
      logError("notification_retry_failed", error, { logId: log.id });
    }
  }
  return summary;
}
