import { type Prisma, PrismaClient } from "@prisma/client";

// singleton سازگار با hot-reload توسعه: بدون آن هر reload یک اتصال جدید می‌سازد.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/** کلاینت عادی یا کلاینت تراکنش؛ مخزن‌هایی که داخل تراکنش هم صدا زده می‌شوند این را می‌گیرند */
export type DbClient = Prisma.TransactionClient;
