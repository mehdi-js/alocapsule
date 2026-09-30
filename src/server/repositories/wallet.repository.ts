import type { WalletTxReason } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";

/**
 * کیف پول (بند ۷.۴). `User.walletBalance` فقط کش است و هر تغییرش همراه یک
 * ردیف `WalletTransaction` در **همان تراکنش** انجام می‌شود؛ این توابع فقط با
 * کلاینت تراکنش صدا زده می‌شوند.
 */

export function findWalletBalance(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
}

/**
 * کسر اتمی: فقط اگر موجودی کافی باشد (شرط داخل خود UPDATE است، پس دو کسر
 * هم‌زمان هرگز موجودی را منفی نمی‌کنند). خروجی: موجودی جدید یا `null`.
 */
export async function debitBalance(
  tx: DbClient,
  userId: string,
  amount: number,
): Promise<number | null> {
  const rows = await tx.$queryRaw<{ walletBalance: number }[]>`
    UPDATE "User"
    SET "walletBalance" = "walletBalance" - ${amount}, "updatedAt" = now()
    WHERE "id" = ${userId} AND "walletBalance" >= ${amount}
    RETURNING "walletBalance"
  `;
  return rows[0]?.walletBalance ?? null;
}

export async function creditBalance(
  tx: DbClient,
  userId: string,
  amount: number,
): Promise<number> {
  const rows = await tx.$queryRaw<{ walletBalance: number }[]>`
    UPDATE "User"
    SET "walletBalance" = "walletBalance" + ${amount}, "updatedAt" = now()
    WHERE "id" = ${userId}
    RETURNING "walletBalance"
  `;
  const balance = rows[0]?.walletBalance;
  if (balance === undefined) throw new Error(`User not found: ${userId}`);
  return balance;
}

export function createWalletTransaction(
  tx: DbClient,
  data: {
    userId: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    balanceAfter: number;
    reason: WalletTxReason;
    orderId: string | null;
    createdByUserId: string | null;
    note: string | null;
  },
) {
  return tx.walletTransaction.create({ data });
}

export interface LedgerMismatch {
  userId: string;
  phone: string;
  walletBalance: number;
  ledgerBalance: number;
  lastBalanceAfter: number | null;
}

/**
 * کاربرانی که موجودی کش‌شده‌شان با دفتر کل نمی‌خواند: جمع CREDIT − DEBIT یا
 * `balanceAfter` آخرین تراکنش ≠ `walletBalance`. تجمیع کاملاً در SQL.
 */
export function findLedgerMismatches(): Promise<LedgerMismatch[]> {
  return db.$queryRaw<LedgerMismatch[]>`
    WITH ledger AS (
      SELECT "userId",
             SUM(CASE WHEN "type" = 'CREDIT' THEN "amount" ELSE -"amount" END)::int AS total
      FROM "WalletTransaction"
      GROUP BY "userId"
    ),
    last_tx AS (
      SELECT DISTINCT ON ("userId") "userId", "balanceAfter"
      FROM "WalletTransaction"
      ORDER BY "userId", "createdAt" DESC, "id" DESC
    )
    SELECT u."id" AS "userId", u."phone", u."walletBalance",
           COALESCE(l.total, 0) AS "ledgerBalance",
           t."balanceAfter" AS "lastBalanceAfter"
    FROM "User" u
    LEFT JOIN ledger l ON l."userId" = u."id"
    LEFT JOIN last_tx t ON t."userId" = u."id"
    WHERE u."walletBalance" <> COALESCE(l.total, 0)
       OR (t."balanceAfter" IS NOT NULL AND t."balanceAfter" <> u."walletBalance")
    ORDER BY u."phone"
  `;
}
