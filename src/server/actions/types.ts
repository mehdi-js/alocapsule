import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { logger } from "@/lib/logger";
import { UserFacingError } from "@/server/errors";

/** خروجی typed اکشن‌ها؛ هیچ‌وقت رکورد خام دیتابیس برنمی‌گردد. */
export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      message: string;
      retryAfterSeconds?: number;
      /** خطای هر فیلد؛ کلید = مسیر نقطه‌ای مثل `variants.0.price` */
      fieldErrors?: Record<string, string>;
    };

export const INVALID_INPUT_MESSAGE = "اطلاعات واردشده معتبر نیست";
const UNEXPECTED_ERROR_MESSAGE =
  "خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.";

export function validationFailure(error: ZodError): {
  ok: false;
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fieldErrors[path] ??= issue.message;
  }
  return {
    ok: false,
    message: error.issues[0]?.message ?? INVALID_INPUT_MESSAGE,
    fieldErrors,
  };
}

/**
 * اجرای منطق اکشن: `UserFacingError` به پیام فارسی تبدیل می‌شود و هر خطای
 * دیگر لاگ شده و پیام عمومی برمی‌گردد (جزئیات داخلی لو نمی‌رود).
 */
export async function runAction<T extends object>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (error) {
    if (error instanceof UserFacingError) {
      return { ok: false, message: error.message };
    }
    logger.error("action_failed", error);
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }
}

/** پس از تغییر کاتالوگ، صفحات عمومی (فاز ۵) دوباره ساخته می‌شوند. */
export function revalidateCatalog(): void {
  revalidatePath("/", "layout");
}
