import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalali } from "@/lib/date";
import { hasCompletionMarker } from "@/lib/seo/settings";
import type { PageDto } from "@/server/services/page.service";

function needsCompletion(page: PageDto): boolean {
  return (
    hasCompletionMarker(page.content) ||
    page.faq.some((item) => hasCompletionMarker(item.answer))
  );
}

export function PagesList({ pages }: { pages: PageDto[] }) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/pages/new" className={buttonClasses("primary")}>
          صفحه‌ی جدید
        </Link>
      </div>
      {pages.length === 0 ? (
        <EmptyState
          title="هنوز صفحه‌ای ساخته نشده است"
          description="صفحات اعتماد: سوالات متداول، شرایط ارسال، مرجوعی و حریم خصوصی."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>عنوان</TH>
              <TH>وضعیت</TH>
              <TH>تکمیل</TH>
              <TH>آخرین ویرایش</TH>
              <TH>
                <span className="sr-only">عملیات</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {pages.map((page) => (
              <TR key={page.id}>
                <TD>
                  <span className="font-medium">{page.title}</span>
                  <div
                    dir="ltr"
                    className="text-start text-xs text-neutral-400"
                  >
                    /{page.slug}
                  </div>
                </TD>
                <TD>
                  {page.isPublished ? (
                    <span className="text-emerald-700">منتشر شده</span>
                  ) : (
                    <span className="text-neutral-500">پیش‌نویس</span>
                  )}
                </TD>
                <TD>
                  {needsCompletion(page) ? (
                    <span className="text-amber-700">متن تکمیلی لازم است</span>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>{formatJalali(page.updatedAt)}</TD>
                <TD>
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100"
                  >
                    ویرایش
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
