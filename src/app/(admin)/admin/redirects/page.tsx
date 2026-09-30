import type { Metadata } from "next";
import Link from "next/link";

import { RedirectsManager } from "@/components/admin/content/RedirectsManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { listRedirects } from "@/server/services/redirect-query.service";

export const metadata: Metadata = { title: "ریدایرکت‌ها" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

export default async function RedirectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = first(params.q).slice(0, 200);
  const page = Math.max(1, Number.parseInt(first(params.page), 10) || 1);
  const from = first(params.from).slice(0, 500) || null;
  const result = await listRedirects({ q, page });

  const href = (target: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return search ? `/admin/redirects?${search}` : "/admin/redirects";
  };

  return (
    <>
      <PageHeader title="ریدایرکت‌ها" crumbs={[{ label: "ریدایرکت‌ها" }]} />
      <form
        method="get"
        className="mb-4 flex gap-2 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="جستجوی آدرس یا یادداشت…"
          aria-label="جستجوی ریدایرکت"
        />
        <button type="submit" className={buttonClasses("primary")}>
          جستجو
        </button>
        {q ? (
          <Link href="/admin/redirects" className={buttonClasses("secondary")}>
            پاک کردن
          </Link>
        ) : null}
      </form>
      <RedirectsManager
        key={`${from ?? ""}-${result.page}`}
        items={result.items}
        prefillFrom={from}
      />
      <p className="mt-4 text-center text-sm text-neutral-500">
        {toPersianDigits(result.total)} ریدایرکت
      </p>
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        buildHref={href}
      />
    </>
  );
}
