import type { Metadata } from "next";

import { NotFoundTable } from "@/components/admin/content/NotFoundTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdmin } from "@/server/auth/current-user";
import { listNotFound } from "@/server/services/redirect-query.service";

export const metadata: Metadata = { title: "خطاهای ۴۰۴" };

export default async function NotFoundLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const page = Math.max(
    1,
    Number.parseInt((await searchParams).page ?? "", 10) || 1,
  );
  const result = await listNotFound(page);
  return (
    <>
      <PageHeader title="خطاهای ۴۰۴" crumbs={[{ label: "خطاهای ۴۰۴" }]} />
      <p className="mb-4 text-sm text-neutral-600">
        آدرس‌هایی که وجود ندارند، به ترتیب تعداد. برای آدرس‌های سایت قبلی
        ریدایرکت بسازید؛ مسیری که ریدایرکت بگیرد خودکار از این فهرست حذف می‌شود.
        تا یک ماه پس از انتشار این صفحه را مرتب بررسی کنید.
      </p>
      <NotFoundTable items={result.items} />
      <div className="mt-4">
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          buildHref={(target) =>
            target > 1 ? `/admin/not-found?page=${target}` : "/admin/not-found"
          }
        />
      </div>
    </>
  );
}
