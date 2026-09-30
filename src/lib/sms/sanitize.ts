function isControlChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 32 || code === 127;
}

/**
 * ملی پیامک مقادیر متغیرهای الگو را در یک رشته با `;` جدا می‌کند و فقط
 * ترتیب اهمیت دارد؛ پس هر `;` داخل مقدار ترتیب بقیه را به هم می‌ریزد.
 * `;` (لاتین و فارسی «؛») و فاصله‌های کنترلی مثل خط جدید با یک فاصله عوض
 * می‌شوند و بقیه‌ی کاراکترهای کنترلی حذف می‌شوند.
 */
export function sanitizeSmsArg(value: string | number): string {
  return Array.from(String(value).replace(/[;؛\s]/g, " "))
    .filter((char) => !isControlChar(char))
    .join("")
    .replace(/ +/g, " ")
    .trim();
}
