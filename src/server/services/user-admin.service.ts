import type {
  OrderStatus,
  UserRole,
  WalletTxReason,
  WalletTxType,
} from "@prisma/client";

import { db } from "@/lib/db";
import { toLatinDigits } from "@/lib/utils";
import type {
  AdminUserInput,
  WalletAdjustmentInput,
} from "@/lib/validation/user";
import { UserFacingError } from "@/server/errors";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  countOtherActiveAdmins,
  countUsers,
  findUserForAdmin,
  findWalletAdjustmentByRequest,
  listUserOrdersForAdmin,
  listUsersForAdmin,
  listUserWalletForAdmin,
  revokeUserSessions,
  updateUserRecord,
} from "@/server/repositories/user-admin.repository";
import {
  createWalletTransaction,
  creditBalance,
  debitBalance,
} from "@/server/repositories/wallet.repository";

/**
 * مدیریت کاربران (ادمین). قواعد:
 * - غیرفعال‌سازی یا تغییر نقش ⇒ همه‌ی نشست‌های کاربر باطل می‌شود.
 * - ادمین نقش یا وضعیت حساب خودش را تغییر نمی‌دهد و آخرین ادمین فعال حذف
 *   نمی‌شود.
 * - تغییر دستی کیف پول همیشه ledger + کش + AuditLog در یک تراکنش (بند ۷.۴).
 */

const USER_NOT_FOUND = "کاربر پیدا نشد.";

export interface AdminUserRowDto {
  id: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  walletBalance: number;
  orderCount: number;
  createdAt: Date;
}

function toRow(
  user: Awaited<ReturnType<typeof findUserForAdmin>> & object,
): AdminUserRowDto {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    walletBalance: user.walletBalance,
    orderCount: user._count.orders,
    createdAt: user.createdAt,
  };
}

/** جستجو بر اساس موبایل (ارقام فارسی هم) یا نام/ایمیل */
export async function listUsers(
  rawQuery: string,
): Promise<{ rows: AdminUserRowDto[]; total: number }> {
  const query = toLatinDigits(rawQuery).trim().slice(0, 60);
  const [users, total] = await Promise.all([
    listUsersForAdmin(query),
    countUsers(query),
  ]);
  return { rows: users.map(toRow), total };
}

export interface AdminUserDetailDto {
  user: AdminUserRowDto;
  wallet: {
    id: string;
    type: WalletTxType;
    reason: WalletTxReason;
    amount: number;
    balanceAfter: number;
    note: string | null;
    createdAt: Date;
    order: { id: string; orderNumber: string } | null;
    createdBy: string | null;
  }[];
  orders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    grandTotal: number;
    placedAt: Date;
  }[];
}

export async function getUserForAdmin(
  userId: string,
): Promise<AdminUserDetailDto | null> {
  const user = await findUserForAdmin(userId);
  if (!user) return null;
  const [wallet, orders] = await Promise.all([
    listUserWalletForAdmin(userId),
    listUserOrdersForAdmin(userId),
  ]);
  return {
    user: toRow(user),
    wallet: wallet.map((tx) => ({
      id: tx.id,
      type: tx.type,
      reason: tx.reason,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      note: tx.note,
      createdAt: tx.createdAt,
      order: tx.order,
      createdBy: tx.createdBy
        ? (tx.createdBy.fullName ?? tx.createdBy.phone)
        : null,
    })),
    orders,
  };
}

/** قفل مشورتی تغییر نقش/وضعیت ادمین‌ها (جلوی حذف هم‌زمان آخرین ادمین) */
const ADMIN_ROLES_LOCK = "admin-roles";

export async function updateUserByAdmin(
  adminId: string,
  userId: string,
  input: AdminUserInput,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ADMIN_ROLES_LOCK}))`;
    const current = await findUserForAdmin(userId, tx);
    if (!current) throw new UserFacingError(USER_NOT_FOUND);

    const roleChanged = current.role !== input.role;
    const deactivated = current.isActive && !input.isActive;
    if (userId === adminId && (roleChanged || !input.isActive)) {
      throw new UserFacingError(
        "نمی‌توانید نقش یا وضعیت حساب خودتان را تغییر دهید.",
      );
    }
    const losesAdmin =
      current.role === "ADMIN" &&
      current.isActive &&
      (input.role !== "ADMIN" || !input.isActive);
    if (losesAdmin && (await countOtherActiveAdmins(tx, userId)) === 0) {
      throw new UserFacingError("حداقل یک ادمین فعال باید باقی بماند.");
    }

    await updateUserRecord(tx, userId, input);
    if (roleChanged || deactivated) {
      await revokeUserSessions(tx, userId, new Date());
    }
    await createAuditLog(tx, {
      actorUserId: adminId,
      action: "user.updated",
      entityType: "User",
      entityId: userId,
      metadata: {
        before: {
          fullName: current.fullName,
          email: current.email,
          role: current.role,
          isActive: current.isActive,
        },
        after: { ...input },
        sessionsRevoked: roleChanged || deactivated,
      },
    });
  });
}

export interface WalletAdjustmentOutcome {
  /** `false` ⇒ همین درخواست قبلاً ثبت شده بود (کلیک دوباره) */
  changed: boolean;
  balance: number;
}

/**
 * شارژ یا کسر دستی کیف پول با یادداشت اجباری. کسر بیش از موجودی رد می‌شود
 * (موجودی هرگز منفی نمی‌شود). `requestId` یکتای فرم جلوی ثبت دوباره را می‌گیرد.
 */
export async function adjustWalletByAdmin(
  adminId: string,
  userId: string,
  input: WalletAdjustmentInput,
): Promise<WalletAdjustmentOutcome> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.requestId}))`;
    const user = await findUserForAdmin(userId, tx);
    if (!user) throw new UserFacingError(USER_NOT_FOUND);
    if (await findWalletAdjustmentByRequest(tx, userId, input.requestId)) {
      return { changed: false, balance: user.walletBalance };
    }

    const balanceAfter =
      input.type === "CREDIT"
        ? await creditBalance(tx, userId, input.amount)
        : await debitBalance(tx, userId, input.amount);
    if (balanceAfter === null) {
      throw new UserFacingError(
        "موجودی کیف پول کمتر از مبلغ کسر است؛ موجودی نمی‌تواند منفی شود.",
      );
    }
    await createWalletTransaction(tx, {
      userId,
      type: input.type,
      amount: input.amount,
      balanceAfter,
      reason: input.type === "CREDIT" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
      orderId: null,
      createdByUserId: adminId,
      note: input.note,
    });
    await createAuditLog(tx, {
      actorUserId: adminId,
      action:
        input.type === "CREDIT" ? "wallet.admin_credit" : "wallet.admin_debit",
      entityType: "User",
      entityId: userId,
      metadata: {
        requestId: input.requestId,
        amount: input.amount,
        balanceAfter,
        note: input.note,
      },
    });
    return { changed: true, balance: balanceAfter };
  });
}
