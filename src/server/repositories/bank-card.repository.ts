import { db } from "@/lib/db";

export function listActiveBankCards() {
  return db.companyBankCard.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

// ───────── ادمین ─────────

export interface BankCardData {
  bankName: string;
  cardNumber: string;
  shebaNumber: string | null;
  accountHolderName: string;
  isActive: boolean;
  sortOrder: number;
}

export function listAllBankCards() {
  return db.companyBankCard.findMany({
    orderBy: [{ sortOrder: "asc" }, { bankName: "asc" }],
  });
}

export function findBankCard(id: string) {
  return db.companyBankCard.findUnique({ where: { id } });
}
