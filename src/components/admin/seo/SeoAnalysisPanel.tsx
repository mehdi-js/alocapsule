"use client";

import { useEffect, useMemo, useState } from "react";

import {
  analyzeSeo,
  type SeoAnalysisInput,
  type SeoConflicts,
  type SeoStatus,
  summarizeSeo,
} from "@/lib/seo/analyze";
import type { SeoEntityKind } from "@/lib/seo/conflicts";
import { cn } from "@/lib/utils";
import { checkSeoConflictsAction } from "@/server/actions/seo";

import { seoSummaryLabel } from "./SeoStatusDot";

const DOT: Record<SeoStatus, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
};

/**
 * تحلیلگر سئو (جایگزین Yoast). چک‌های محلی فوری‌اند؛ تکراری بودن کلمه/عنوان/
 * متا با تأخیر کوتاه از سرور پرسیده می‌شود. فقط هشدار است و ذخیره را مسدود
 * نمی‌کند.
 */
export function SeoAnalysisPanel({
  input,
  kind,
  id,
  categoryId = null,
}: {
  input: Omit<SeoAnalysisInput, "conflicts">;
  kind: SeoEntityKind;
  id: string | null;
  /** فقط محصول: دسته‌ی انتخاب‌شده برای چک شباهت متن */
  categoryId?: string | null;
}) {
  const [conflicts, setConflicts] = useState<SeoConflicts | null>(null);
  const { name, focusKeyword, seoTitle, metaDescription, text } = input;
  const description = kind === "product" ? text : null;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSeoConflictsAction({
        kind,
        id,
        name,
        focusKeyword,
        seoTitle,
        metaDescription,
        categoryId,
        description,
      });
      if (!cancelled && result.ok) setConflicts(result.conflicts);
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    kind,
    id,
    name,
    focusKeyword,
    seoTitle,
    metaDescription,
    categoryId,
    description,
  ]);

  const checks = useMemo(
    () => analyzeSeo({ ...input, conflicts }),
    [input, conflicts],
  );
  const summary = summarizeSeo(checks);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">تحلیل سئو</h3>
        <span className="text-xs text-neutral-600">
          {seoSummaryLabel(summary)}
        </span>
      </div>
      <ul className="space-y-2 text-sm" aria-live="polite">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                "mt-2 size-2.5 shrink-0 rounded-full",
                DOT[check.status],
              )}
            />
            <span
              className={cn(
                check.status === "bad" && "font-medium text-red-700",
              )}
            >
              {check.message}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500">
        این موارد فقط راهنما هستند و مانع ذخیره نمی‌شوند.
      </p>
    </div>
  );
}
