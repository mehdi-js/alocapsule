import sanitizeHtml from "sanitize-html";

/**
 * متن ساده‌ی چندخطی (مثل توضیحات محصول): همه‌ی تگ‌های HTML حذف می‌شوند و
 * فقط متن و بریدگی خط می‌ماند. خروجی خالی ⇒ `null`.
 */
export function sanitizePlainText(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const text = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    // محتوای این تگ‌ها متن نیست و کامل حذف می‌شود.
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}
