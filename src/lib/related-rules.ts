/**
 * قواعد «محصولات مرتبط» (SEO.md §۵.۳). ترتیب: محصول متناظر ← موردهای قاعده‌ی
 * دسته (مثل پیک‌نیک، کپسول دست دوم) ← بقیه‌ی محصولات همان دسته. محصول غیرفعال
 * هرگز نمی‌آید (کوئری فقط محصول قابل‌فروش می‌دهد). قواعد در `Setting`
 * (`catalog.relatedRules`) و قابل ویرایش‌اند، نه ثابت در کد.
 */

export const RELATED_RULES_KEY = "catalog.relatedRules";

/** `product:نامک` یا `category:نامک` */
export type RelatedRef =
  { kind: "product"; slug: string } | { kind: "category"; slug: string };

export type RelatedRules = Record<string, RelatedRef[]>;

/** نامک دسته‌ی محصول ⇒ مرجع‌های مرتبط به ترتیب (seed بند ۵.۳) */
export const DEFAULT_RELATED_RULES: Record<string, string[]> = {
  "gas-capsule-refill": ["product:picnic-gas"],
  "buy-gas-capsule": ["product:picnic-gas", "product:used-gas-capsule"],
  "used-gas-capsules": [
    "product:buy-gas-capsule-11kg",
    "category:gas-capsule-refill",
  ],
};

const REF = /^(product|category):([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** مقدار نبود/نامعتبر ⇒ بدون قاعده؛ مرجع نامعتبر نادیده گرفته می‌شود */
export function parseRelatedRules(raw: unknown): RelatedRules {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const rules: RelatedRules = {};
  for (const [categorySlug, refs] of Object.entries(raw)) {
    if (!Array.isArray(refs)) continue;
    rules[categorySlug] = refs.flatMap((ref) => {
      const match = typeof ref === "string" ? REF.exec(ref) : null;
      return match
        ? [{ kind: match[1] as RelatedRef["kind"], slug: match[2]! }]
        : [];
    });
  }
  return rules;
}

/**
 * ترتیب نهایی: متناظر، گروه‌های قاعده به ترتیب، هم‌دسته‌ها؛ بدون تکرار و بدون
 * خود محصول؛ حداکثر `limit`.
 */
export function orderRelated<T extends { id: string }>(
  selfId: string,
  groups: readonly (readonly T[])[],
  limit: number,
): T[] {
  const seen = new Set([selfId]);
  const result: T[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
      if (result.length === limit) return result;
    }
  }
  return result;
}
