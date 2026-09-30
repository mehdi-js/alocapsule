import type { Prisma } from "@prisma/client";

import type { DbClient } from "@/lib/db";

/** هر عمل مالی یک ردیف AuditLog در همان تراکنش عمل می‌سازد */
export function createAuditLog(
  tx: DbClient,
  data: {
    actorUserId: string;
    action: string;
    entityType: "Order" | "Payment" | "User";
    entityId: string;
    metadata: Prisma.InputJsonObject;
  },
) {
  return tx.auditLog.create({ data });
}
