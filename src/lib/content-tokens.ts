import { todo } from "@/lib/brand";

/**
 * جای‌گذاری مقدارهای تنظیمات در متن‌های seed (SEO.md §۱۰.۱): زمان تحویل، آستانه‌ی
 * ارسال رایگان و ساعت تحویل حضوری ثابت در متن نمی‌نشینند و از `ShippingMethod` و
 * `business.pickupHours` می‌آیند. قالب: `[[normal.estimate]]`. توکنِ بدون مقدار
 * به `{{تکمیل توسط الو کپسول: …}}` تبدیل می‌شود تا `seo:audit` آن را بگیرد.
 */

export const CONTENT_TOKENS = {
  "normal.estimate": "زمان تحویل ارسال عادی",
  "express.estimate": "زمان تحویل ارسال فوری",
  "free.quantity": "آستانه‌ی ارسال رایگان (تعداد)",
  "pickup.hours": "ساعت تحویل حضوری",
} as const;

export type ContentTokenKey = keyof typeof CONTENT_TOKENS;
export type ContentTokenValues = Partial<Record<ContentTokenKey, string>>;

const TOKEN = /\[\[([a-z.]+)\]\]/g;

export function applyContentTokens(
  text: string,
  values: ContentTokenValues,
): string {
  return text.replace(TOKEN, (whole, key: string) => {
    if (!(key in CONTENT_TOKENS)) return whole;
    const value = values[key as ContentTokenKey]?.trim();
    return value || todo(CONTENT_TOKENS[key as ContentTokenKey]);
  });
}

export function applyTokensToFaq<
  T extends { question: string; answer: string },
>(items: T[], values: ContentTokenValues): T[] {
  return items.map((item) => ({
    ...item,
    question: applyContentTokens(item.question, values),
    answer: applyContentTokens(item.answer, values),
  }));
}
