import { richTextToPlain } from "@/lib/rich-text";

import { normalizeFa } from "./text";

/**
 * شباهت متن دو صفحه (SEO.md §۷.۵): ضریب Jaccard روی shingleهای ۳کلمه‌ای پس از
 * `normalizeFa` و حذف ارقام. ارقام حذف می‌شوند تا «شارژ کپسول ۱۱ کیلویی» و «شارژ
 * کپسول ۲۵ کیلویی» که فقط عدد اندازه‌شان فرق می‌کند، یکسان شمرده شوند؛ همین
 * ریسک محتوای تکراری بین صفحه‌های اندازه است (§۳.۳).
 */

export const SHINGLE_SIZE = 3;
/** بالاتر از این 🔴 */
export const SIMILARITY_BAD = 0.6;
/** از این تا 🔴 ⇒ 🟠 */
export const SIMILARITY_WARN = 0.4;

/** کلمه‌ها پس از نرمال‌سازی؛ علامت‌ها و رقم‌ها حذف می‌شوند */
export function similarityWords(text: string | null | undefined): string[] {
  const plain = richTextToPlain(text ?? "");
  return normalizeFa(plain)
    .replace(/[0-9]+/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(words: string[]): Set<string> {
  const result = new Set<string>();
  if (words.length < SHINGLE_SIZE) {
    if (words.length > 0) result.add(words.join(" "));
    return result;
  }
  for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
    result.add(words.slice(i, i + SHINGLE_SIZE).join(" "));
  }
  return result;
}

/** ۰ تا ۱؛ هر دو خالی ⇒ ۰ (چیزی برای مقایسه نیست) */
export function textSimilarity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const left = shingles(similarityWords(a));
  const right = shingles(similarityWords(b));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared++;
  return shared / (left.size + right.size - shared);
}

export type SimilarityLevel = "good" | "warn" | "bad";

export function similarityLevel(score: number): SimilarityLevel {
  if (score > SIMILARITY_BAD) return "bad";
  if (score >= SIMILARITY_WARN) return "warn";
  return "good";
}
