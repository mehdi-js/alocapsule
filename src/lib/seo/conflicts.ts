import type { SeoConflicts } from "./analyze";
import { textSimilarity } from "./similarity";
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
  /** فقط محصول: دسته و توضیحات (چک شباهت متن، SEO.md §۷.۵) */
  categoryId?: string | null;
  description?: string | null;
}

export interface SeoTarget {
  kind: SeoEntityKind;
  /** `null` ⇒ رکورد هنوز ساخته نشده */
  id: string | null;
  name: string;
  focusKeyword: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  categoryId?: string | null;
  description?: string | null;
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
  const result: SeoConflicts = {
    focusKeyword: matching((entry) => key(entry.focusKeyword)),
    seoTitle: matching((entry) =>
      key(effectiveTitle(entry.seoTitle, entry.name)),
    ),
    metaDescription: matching((entry) => key(entry.metaDescription)),
  };
  // شباهت متن فقط بین محصولات هم‌دسته و وقتی توضیحات داده شده
  if (target.kind === "product" && target.description && target.categoryId) {
    result.similarText = others
      .filter(
        (entry) =>
          entry.kind === "product" &&
          entry.categoryId === target.categoryId &&
          entry.description,
      )
      .map((entry) => ({
        name: seoEntityLabel(entry),
        score: textSimilarity(target.description, entry.description),
      }));
  }
  return result;
}
