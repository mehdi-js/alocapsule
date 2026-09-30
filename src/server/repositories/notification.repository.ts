import type {
  NotificationStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/db";

/** لاگ پیامک‌های سفارش؛ `unique(orderId, type)` جلوی ارسال دوباره‌ی یک رویداد را می‌گیرد */

export function findOrderForNotification(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      grandTotal: true,
      trackingCode: true,
      userId: true,
      shippingAddressSnapshot: true,
      user: { select: { phone: true, fullName: true } },
    },
  });
}

export function createNotificationLog(data: {
  /** `null` برای پیامک‌های مدیر */
  userId: string | null;
  phone: string;
  type: NotificationType;
  /** `null` برای کد ورود */
  orderId: string | null;
  payload: Prisma.InputJsonObject;
}) {
  return db.notificationLog.create({
    data: { ...data, status: "PENDING", attempts: 0 },
    select: { id: true },
  });
}

export function findNotificationLog(id: string) {
  return db.notificationLog.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      phone: true,
      status: true,
      attempts: true,
      payload: true,
      providerMessageId: true,
    },
  });
}

/**
 * گرفتن نوبت ارسال: فقط اگر تعداد تلاش هنوز همان مقدار خوانده‌شده باشد و
 * پیامک ارسال نشده باشد. دو اجرای هم‌زمان (مثلاً job و ادمین) یک پیامک را
 * دوبار نمی‌فرستند.
 */
export async function claimAttempt(
  id: string,
  expectedAttempts: number,
): Promise<boolean> {
  const { count } = await db.notificationLog.updateMany({
    where: {
      id,
      attempts: expectedAttempts,
      status: { in: ["PENDING", "FAILED"] },
    },
    data: { attempts: { increment: 1 }, status: "PENDING" },
  });
  return count > 0;
}

export function markNotificationSent(
  id: string,
  providerMessageId: string,
  payload: Prisma.InputJsonObject,
) {
  return db.notificationLog.update({
    where: { id },
    data: {
      status: "SENT",
      providerMessageId,
      errorMessage: null,
      sentAt: new Date(),
      payload,
    },
  });
}

export function markNotificationFailed(
  id: string,
  errorMessage: string,
  payload: Prisma.InputJsonObject,
) {
  return db.notificationLog.update({
    where: { id },
    data: { status: "FAILED", errorMessage, payload },
  });
}

/**
 * قابل تلاش دوباره: ناموفق با تلاش کمتر از سقف، یا «در انتظار»ی که مدتی
 * مانده (مثلاً فرایند وسط ارسال قطع شده).
 */
export function findRetryableLogs(maxAttempts: number, staleBefore: Date) {
  return db.notificationLog.findMany({
    where: {
      attempts: { lt: maxAttempts },
      // کد ورود کهنه به کار نمی‌آید؛ هرگز دوباره فرستاده نمی‌شود
      type: { not: "OTP" },
      OR: [
        { status: "FAILED" },
        { status: "PENDING", createdAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, attempts: true },
  });
}

export function listNotificationLogs(
  status: NotificationStatus | null,
  take = 100,
) {
  return db.notificationLog.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      phone: true,
      status: true,
      attempts: true,
      providerMessageId: true,
      errorMessage: true,
      payload: true,
      createdAt: true,
      sentAt: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });
}

export function countNotificationsByStatus() {
  return db.notificationLog.groupBy({ by: ["status"], _count: { _all: true } });
}
