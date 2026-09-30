import { toLatinDigits } from "@/lib/utils";

/**
 * نامک محصول و دسته (SEO.md §۴.۲): فقط حروف کوچک لاتین، عدد و خط تیره،
 * حداکثر ۶۰ کاراکتر، بدون حروف فارسی. از نام فارسی ساخته نمی‌شود (آوانگاری
 * خودکار نامک بد می‌سازد و نامک ماندگار است)؛ ادمین آن را وارد می‌کند.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 60;

/**
 * پیشنهاد نامک از متن لاتین («Example  Product!» ⇒ `example-product`).
 * حروف غیرلاتین حذف می‌شوند؛ نام تمام‌فارسی ⇒ `""`. در ۶۰ کاراکتر، روی مرز
 * خط تیره بریده می‌شود.
 */
export function slugify(input: string): string {
  const slug = toLatinDigits(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_SLUG_LENGTH + 1);
  const lastDash = cut.lastIndexOf("-");
  return (
    lastDash > 0 ? cut.slice(0, lastDash) : slug.slice(0, MAX_SLUG_LENGTH)
  ).replace(/-+$/, "");
}

/** اگر `base` گرفته شده بود `base-2`، `base-3`، … */
export async function ensureUniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  for (let suffix = 2; await isTaken(candidate); suffix++) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
