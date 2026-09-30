import { Prisma } from "@prisma/client";

/** خطایی که پیامش (فارسی) عیناً به کاربر نمایش داده می‌شود. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** نقض قید یکتایی Prisma (P2002)؛ `target` فیلدهای درگیر را برمی‌گرداند. */
export function getUniqueViolationTarget(error: unknown): string[] | null {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;
    return Array.isArray(target) ? target.map(String) : [];
  }
  return null;
}

/** رکورد یافت نشد (P2025) */
export function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
