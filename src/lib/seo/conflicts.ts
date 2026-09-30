import type { SeoConflicts } from "./analyze";
import { normalizeFa } from "./text";
import { effectiveTitle } from "./title";

/**
 * یکتایی کلمه‌ی کانونی، عنوان و متا در کل سایت (SEO.md §۱۰.۲). داده‌ی همه‌ی
 * محصولات (بایگانی‌نشده) و دسته‌ها یک‌جا خوانده و اینجا مقایسه می‌شود؛
 * کاتالوگ کوچک است و این کار از کوئری جدا برای هر فیلد ساده‌تر است.
 */

export type SeoEntityKind = "product" | "category";

export interface SeoIndexEntry {
  kind: SeoEntityKind;
  id: string;
  name: string;
  focusKeyword: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
}

export interface SeoTarget {
  kind: SeoEntityKind;
  /** `null` ⇒ رکورد هنوز ساخته نشده */
  id: string | null;
  name: string;
  focusKeyword: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
}

const KIND_LABELS: Record<SeoEntityKind, string> = {
  product: "محصول",
  category: "دسته",
};

export function seoEntityLabel(entry: {
  kind: SeoEntityKind;
  name: string;
}): string {
  return `${KIND_LABELS[entry.kind]} «${entry.name}»`;
}

function key(value: string | null | undefined): string {
  return value ? normalizeFa(value) : "";
}

export function findSeoConflicts(
  index: SeoIndexEntry[],
  target: SeoTarget,
): SeoConflicts {
  const others = index.filter(
    (entry) => !(entry.kind === target.kind && entry.id === target.id),
  );
  const matching = (
    pick: (entry: SeoIndexEntry | SeoTarget) => string,
  ): string[] => {
    const wanted = pick(target);
    if (!wanted) return [];
    return others.filter((entry) => pick(entry) === wanted).map(seoEntityLabel);
  };
  return {
    focusKeyword: matching((entry) => key(entry.focusKeyword)),
    seoTitle: matching((entry) =>
      key(effectiveTitle(entry.seoTitle, entry.name)),
    ),
    metaDescription: matching((entry) => key(entry.metaDescription)),
  };
}
