import { normalizeFa } from "./text";

export interface KeywordOwner {
  /** برای پیام: «محصول باقلوا گردویی» */
  label: string;
  focusKeyword: string | null;
}

/**
 * گروه‌هایی که کلمه‌ی کانونی یکسان (بعد از `normalizeFa`) دارند؛ قاعده‌ی
 * «یک نیت جستجو = یک URL» (SEO.md §۱.۲). کلمه‌ی خالی نادیده گرفته می‌شود.
 */
export function findDuplicateKeywords(
  owners: KeywordOwner[],
): { keyword: string; labels: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const { label, focusKeyword } of owners) {
    const key = focusKeyword ? normalizeFa(focusKeyword) : "";
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), label]);
  }
  return [...groups]
    .filter(([, labels]) => labels.length > 1)
    .map(([keyword, labels]) => ({ keyword, labels }));
}
