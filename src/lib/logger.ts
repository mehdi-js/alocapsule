/**
 * لاگ ساختاریافته: هر رویداد یک خط JSON روی stdout/stderr (برای
 * `docker compose logs` و ابزارهای جمع‌آوری لاگ). هرگز داده‌ی حساس
 * (رمز، توکن، کد OTP، شماره‌ی کامل) لاگ نشود.
 */

type Level = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

/** پیام و نوع خطا (+ stack کوتاه‌شده) برای لاگ */
export function errorFields(error: unknown): Fields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 6).join("\n"),
    };
  }
  return { message: String(error) };
}

function write(level: Level, event: string, fields: Fields): void {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, fields: Fields = {}) => write("info", event, fields),
  warn: (event: string, fields: Fields = {}) => write("warn", event, fields),
  error: (event: string, error?: unknown, fields: Fields = {}) =>
    write("error", event, {
      ...(error === undefined ? {} : errorFields(error)),
      ...fields,
    }),
};
