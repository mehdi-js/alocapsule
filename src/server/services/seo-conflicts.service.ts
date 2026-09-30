import type { SeoConflicts } from "@/lib/seo/analyze";
import { findSeoConflicts, type SeoTarget } from "@/lib/seo/conflicts";
import { listSeoIndex } from "@/server/repositories/seo.repository";

/** کلمه‌ی کانونی، عنوان و متای تکراری در سایت (کوئری سرور، SEO.md §۱۰.۲) */
export async function getSeoConflicts(
  target: SeoTarget,
): Promise<SeoConflicts> {
  return findSeoConflicts(await listSeoIndex(), target);
}

export function hasConflicts(conflicts: SeoConflicts): boolean {
  return (
    conflicts.focusKeyword.length > 0 ||
    conflicts.seoTitle.length > 0 ||
    conflicts.metaDescription.length > 0
  );
}

/** پیام هشدار پس از ذخیره (ذخیره انجام شده؛ فقط اطلاع) */
export function conflictWarning(conflicts: SeoConflicts): string | null {
  const parts = [
    conflicts.focusKeyword.length
      ? `کلمه‌ی کانونی با ${conflicts.focusKeyword.join("، ")}`
      : null,
    conflicts.seoTitle.length
      ? `عنوان سئو با ${conflicts.seoTitle.join("، ")}`
      : null,
    conflicts.metaDescription.length
      ? `توضیحات متا با ${conflicts.metaDescription.join("، ")}`
      : null,
  ].filter(Boolean);
  return parts.length ? `ذخیره شد، ولی ${parts.join("؛ ")} تکراری است.` : null;
}
