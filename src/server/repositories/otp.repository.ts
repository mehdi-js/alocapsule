import { db } from "@/lib/db";

export function createOtp(data: {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  ip: string | null;
}) {
  return db.otpCode.create({ data });
}

/** کدهای قبلیِ مصرف‌نشده‌ی این شماره را باطل می‌کند؛ فقط آخرین کد معتبر است. */
export function invalidateOtps(phone: string, now: Date) {
  return db.otpCode.updateMany({
    where: { phone, consumedAt: null },
    data: { consumedAt: now },
  });
}

/** آخرین کد مصرف‌نشده و منقضی‌نشده‌ی شماره. */
export function findActiveOtp(phone: string, now: Date) {
  return db.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
}

/** افزایش اتمی شمارنده‌ی تلاش؛ مقدار جدید را برمی‌گرداند. */
export async function incrementOtpAttempts(id: string): Promise<number> {
  const otp = await db.otpCode.update({
    where: { id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });
  return otp.attempts;
}

/** مصرف اتمی کد: فقط یک درخواست موفق می‌شود (`true`). */
export async function consumeOtp(id: string, now: Date): Promise<boolean> {
  const { count } = await db.otpCode.updateMany({
    where: { id, consumedAt: null },
    data: { consumedAt: now },
  });
  return count === 1;
}
