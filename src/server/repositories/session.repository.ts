import type { LoginMethod } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";

export function createSessionRecord(data: {
  id: string;
  userId: string;
  tokenHash: string;
  method: LoginMethod;
  expiresAt: Date;
  userAgent: string | null;
}) {
  return db.session.create({ data });
}

export function findSessionById(id: string) {
  return db.session.findUnique({ where: { id } });
}

export function revokeSession(id: string, now: Date) {
  return db.session.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now },
  });
}

/** ابطال همه‌ی نشست‌های کاربر (مثلاً هنگام غیرفعال‌سازی) */
export function revokeAllUserSessions(userId: string, now: Date) {
  return db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
}

/** پس از تغییر رمز: همه‌ی نشست‌های دیگر کاربر باطل می‌شوند (نشست فعلی می‌ماند) */
export function revokeOtherUserSessions(
  tx: DbClient,
  userId: string,
  keepSessionId: string | null,
  now: Date,
) {
  return tx.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
    },
    data: { revokedAt: now },
  });
}
