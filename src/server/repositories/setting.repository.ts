import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export async function getSetting(
  key: string,
): Promise<Prisma.JsonValue | null> {
  const setting = await db.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export function upsertSetting(key: string, value: Prisma.InputJsonValue) {
  return db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** چند کلید با یک کوئری؛ کلید نبود ⇒ در خروجی نیست */
export async function getSettings(
  keys: string[],
): Promise<Map<string, Prisma.JsonValue>> {
  const rows = await db.setting.findMany({ where: { key: { in: keys } } });
  return new Map(rows.map((row) => [row.key, row.value]));
}

/** چند کلید در یک تراکنش */
export function upsertSettings(values: Record<string, Prisma.InputJsonValue>) {
  return db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
}
