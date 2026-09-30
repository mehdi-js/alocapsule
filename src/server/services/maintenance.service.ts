import { db } from "@/lib/db";
import {
  MAINTENANCE_KEY,
  type MaintenanceState,
  parseMaintenance,
} from "@/lib/maintenance";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  getSetting,
  upsertSetting,
} from "@/server/repositories/setting.repository";

/** وضعیت حالت بروزرسانی (`site.maintenance`) */
export async function getMaintenance(): Promise<MaintenanceState> {
  return parseMaintenance(await getSetting(MAINTENANCE_KEY));
}

/**
 * نسخه‌ی کش‌شده برای middleware (هر درخواست صفحه): حداکثر ۵ ثانیه کهنه.
 * خطای دیتابیس ⇒ آخرین مقدار معلوم (یا خاموش) تا سایت به‌خاطر خطای موقت
 * بسته نشود.
 */
const TTL_MS = 5_000;
let cached: { state: MaintenanceState; expiresAt: number } | null = null;

export async function getMaintenanceCached(
  now = Date.now(),
): Promise<MaintenanceState> {
  if (cached && cached.expiresAt > now) return cached.state;
  try {
    const state = await getMaintenance();
    cached = { state, expiresAt: now + TTL_MS };
    return state;
  } catch {
    return cached?.state ?? parseMaintenance(null);
  }
}

export async function setMaintenance(
  adminId: string,
  input: MaintenanceState,
): Promise<void> {
  await upsertSetting(MAINTENANCE_KEY, { ...input });
  cached = null;
  await db.$transaction((tx) =>
    createAuditLog(tx, {
      actorUserId: adminId,
      action: input.enabled
        ? "settings.maintenance_enabled"
        : "settings.maintenance_disabled",
      entityType: "User",
      entityId: adminId,
      metadata: { message: input.message },
    }),
  );
}
