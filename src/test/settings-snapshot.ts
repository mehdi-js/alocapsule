import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * تست‌های یکپارچه روی دیتابیس توسعه اجرا می‌شوند؛ تنظیماتی که ادمین در پنل
 * ذخیره کرده (مثل الگوها و اتصال ملی پیامک) پیش از تست کنار گذاشته و پس از
 * آن **دقیقاً** برگردانده می‌شوند. هرگز فقط پاک نکنید.
 */
export async function setAsideSettings(
  keys: string[],
): Promise<() => Promise<void>> {
  const saved = await db.setting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
  await db.setting.deleteMany({ where: { key: { in: keys } } });
  return async () => {
    await db.setting.deleteMany({ where: { key: { in: keys } } });
    for (const { key, value } of saved) {
      await db.setting.create({
        data: { key, value: value as Prisma.InputJsonValue },
      });
    }
  };
}
