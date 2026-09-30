/**
 * ابزارهای متنی سئو (SEO.md فاز S0). همه خالص‌اند و در تحلیلگر ادمین،
 * چک یکتایی کلمه‌ی کلیدی و ساخت متای خودکار استفاده می‌شوند.
 */

const ZWNJ = "‌";
/** اعراب عربی/فارسی + تطویل (کشیده) + نیم‌فاصله‌های دیگر و علامت جهت */
const IGNORED_MARKS = /[ً-ٰٟـ​‍‎‏⁦-⁩﻿]/g;
const ARABIC_TO_PERSIAN: Record<string, string> = {
  ي: "ی", // ي
  ى: "ی", // ى
  ك: "ک", // ك
  ة: "ه", // ة
  ۀ: "ه", // ۀ
  أ: "ا", // أ
  إ: "ا", // إ
  ٱ: "ا", // ٱ
};
const DIGITS = /[۰-۹٠-٩]/g;

function latinDigit(char: string): string {
  const code = char.charCodeAt(0);
  return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
}

/**
 * نرمال‌سازی برای **مقایسه** (نه نمایش): ي/ك عربی ⇒ ی/ک، حذف اعراب و کشیده،
 * نیم‌فاصله ⇒ فاصله، ارقام ⇒ لاتین، حروف کوچک و فاصله‌های تکراری ⇒ یکی.
 * بنابراین «باقلوا پسته ای» و «باقلوا پسته‌ای» برابرند.
 */
export function normalizeFa(input: string): string {
  return input
    .normalize("NFC")
    .replace(IGNORED_MARKS, "")
    .replace(/[يىكةۀأإٱ]/g, (c) => ARABIC_TO_PERSIAN[c] ?? c)
    .replace(DIGITS, latinDigit)
    .replaceAll(ZWNJ, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  zwnj: ZWNJ,
};

/** HTML ⇒ متن ساده (برای شمارش کلمه، چگالی کلمه‌ی کلیدی و متای خودکار) */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|section|article)\b[^>]*>/gi,
      " ",
    )
    .replace(/<[^>]+>/g, "")
    .replace(
      /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
      (entity: string, name: string) => {
        const lower = name.toLowerCase();
        if (lower.startsWith("#x"))
          return String.fromCodePoint(parseInt(lower.slice(2), 16));
        if (lower.startsWith("#"))
          return String.fromCodePoint(Number(lower.slice(1)));
        return ENTITIES[lower] ?? entity;
      },
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * کوتاه کردن تا `max` کاراکتر بدون شکستن کلمه؛ اگر برید، «…» می‌گیرد
 * (طول خروجی با «…» از `max` بیشتر نمی‌شود).
 */
export function truncateAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const room = clean.slice(0, Math.max(0, max - 1));
  const lastSpace = room.lastIndexOf(" ");
  const cut = lastSpace > 0 ? room.slice(0, lastSpace) : room;
  return `${cut.replace(/[\s،,؛;:.\-–—]+$/u, "")}…`;
}

/** تعداد کلمات؛ نیم‌فاصله جداکننده‌ی کلمه نیست («پسته‌ای» یک کلمه است) */
export function countWords(text: string): number {
  const words = stripHtml(text)
    .split(/[\s​]+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  return words.length;
}
