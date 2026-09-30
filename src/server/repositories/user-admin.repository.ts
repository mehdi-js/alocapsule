import type { Prisma } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";

/** مدیریت کاربران در ادمین */

const userRow = {
  id: true,
  phone: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  walletBalance: true,
  createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

/** جستجو در موبایل، نام و ایمیل (`query` از قبل با ارقام لاتین) */
export function listUsersForAdmin(query: string, take = 100) {
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { phone: { contains: query } },
          { fullName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};
  return db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: userRow,
  });
}

export function countUsers(query: string) {
  return db.user.count({
    where: query
      ? {
          OR: [
            { phone: { contains: query } },
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
  });
}

export function findUserForAdmin(id: string, client: DbClient = db) {
  return client.user.findUnique({ where: { id }, select: userRow });
}

export function countOtherActiveAdmins(tx: DbClient, excludeId: string) {
  return tx.user.count({
    where: { role: "ADMIN", isActive: true, id: { not: excludeId } },
  });
}

export function updateUserRecord(
  tx: DbClient,
  id: string,
  data: Prisma.UserUpdateInput,
) {
  return tx.user.update({ where: { id }, data });
}

export function revokeUserSessions(tx: DbClient, userId: string, now: Date) {
  return tx.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
}

export function listUserWalletForAdmin(userId: string, take = 200) {
  return db.walletTransaction.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfter: true,
      reason: true,
      note: true,
      createdAt: true,
      order: { select: { id: true, orderNumber: true } },
      createdBy: { select: { phone: true, fullName: true } },
    },
  });
}

export function listUserOrdersForAdmin(userId: string, take = 20) {
  return db.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      placedAt: true,
    },
  });
}

/** شارژ دستی تکراری؟ (همان `requestId` قبلاً ثبت شده) */
export function findWalletAdjustmentByRequest(
  tx: DbClient,
  userId: string,
  requestId: string,
) {
  return tx.auditLog.findFirst({
    where: {
      entityType: "User",
      entityId: userId,
      action: { in: ["wallet.admin_credit", "wallet.admin_debit"] },
      metadata: { path: ["requestId"], equals: requestId },
    },
    select: { id: true },
  });
}
