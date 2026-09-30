import { db, type DbClient } from "@/lib/db";

export function findUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}

/** `phone` باید قبلاً با normalizePhone نرمال شده باشد. */
export function findUserByPhone(phone: string) {
  return db.user.findUnique({ where: { phone } });
}

/** ساخت کاربر در اولین ورود؛ upsert جلوی ساخت دوباره در درخواست‌های هم‌زمان را می‌گیرد. */
export function findOrCreateUserByPhone(phone: string) {
  return db.user.upsert({
    where: { phone },
    create: { phone },
    update: {},
  });
}

export function setUserPassword(
  tx: DbClient,
  userId: string,
  passwordHash: string,
  now: Date,
) {
  return tx.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: now },
    select: { id: true },
  });
}
