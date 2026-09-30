import type {
  NotificationStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import {
  countNotificationsByStatus,
  listNotificationLogs,
} from "@/server/repositories/notification.repository";

import { MAX_NOTIFICATION_ATTEMPTS } from "./notification.service";

export type NotificationFilter = NotificationStatus | "ALL";

export interface NotificationRowDto {
  id: string;
  type: NotificationType;
  phone: string;
  status: NotificationStatus;
  attempts: number;
  /** امکان «تلاش دوباره» (ناموفق و زیر سقف تلاش) */
  canRetry: boolean;
  /** پیامک ملی پیامک با recId ⇒ «وضعیت تحویل» قابل پرسیدن است */
  canCheckDelivery: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
  text: string;
  patternId: string;
  createdAt: Date;
  sentAt: Date | null;
  order: { id: string; orderNumber: string } | null;
}

function payloadField(value: Prisma.JsonValue, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const field = value[key];
  return typeof field === "string" ? field : "";
}

export async function listNotifications(filter: NotificationFilter): Promise<{
  rows: NotificationRowDto[];
  counts: Record<NotificationStatus, number>;
}> {
  const [logs, grouped] = await Promise.all([
    listNotificationLogs(filter === "ALL" ? null : filter),
    countNotificationsByStatus(),
  ]);
  const counts: Record<NotificationStatus, number> = {
    PENDING: 0,
    SENT: 0,
    FAILED: 0,
  };
  for (const group of grouped) counts[group.status] = group._count._all;

  return {
    rows: logs.map((log) => ({
      id: log.id,
      type: log.type,
      phone: log.phone,
      status: log.status,
      attempts: log.attempts,
      canRetry:
        log.type !== "OTP" &&
        log.status === "FAILED" &&
        log.attempts < MAX_NOTIFICATION_ATTEMPTS,
      canCheckDelivery:
        log.status === "SENT" && /^\d{10,}$/.test(log.providerMessageId ?? ""),
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      text: payloadField(log.payload, "text"),
      patternId: payloadField(log.payload, "patternId"),
      createdAt: log.createdAt,
      sentAt: log.sentAt,
      order: log.order,
    })),
    counts,
  };
}
