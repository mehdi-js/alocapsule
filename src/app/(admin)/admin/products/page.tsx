import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/PageHeader";
import { ProductFilters } from "@/components/admin/ProductFilters";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { listCategories } from "@/server/services/category.service";
import {
  listArchiveTargets,
  listProducts,
  parseProductListParams,
  type ProductListParams,
} from "@/server/services/product-query.service";

export const metadata: Metadata = { title: "محصولات" };

function buildHref(params: ProductListParams, page: number): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.categoryId) query.set("category", params.categoryId);
  if (params.status !== "all") query.set("status", params.status);
  if (page > 1) query.set("page", String(page));
  const search = query.toString();
  return search ? `/admin/products?${search}` : "/admin/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = parseProductListParams(await searchParams);
  const [result, categories, targets] = await Promise.all([
    listProducts(params),
    listCategories(),
    listArchiveTargets(),
  ]);

  // صفحه‌ی خارج از محدوده ⇒ آخرین صفحه‌ی موجود
  if (result.items.length === 0 && params.page > result.pageCount) {
    redirect(buildHref(params, result.pageCount));
  }

  const hasFilters = params.q || params.categoryId || params.status !== "all";

  return (
    <>
      <PageHeader
        title="محصولات"
        crumbs={[{ label: "محصولات" }]}
        actions={
          <Link href="/admin/products/new" className={buttonClasses("primary")}>
            محصول جدید
          </Link>
        }
      />
      <ProductFilters params={params} categories={categories} />

      {result.items.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "محصولی با این فیلترها پیدا نشد"
              : "هنوز محصولی ثبت نشده است"
          }
          description={
            hasFilters
              ? "فیلترها را تغییر دهید یا پاک کنید."
              : "اولین محصول فروشگاه را اضافه کنید."
          }
          action={
            hasFilters ? undefined : (
              <Link
                href="/admin/products/new"
                className={buttonClasses("primary")}
              >
                محصول جدید
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <ProductsTable items={result.items} targets={targets} />
          <p className="text-center text-sm text-neutral-500">
            {toPersianDigits(result.total)} محصول
          </p>
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            buildHref={(page) => buildHref(params, page)}
          />
        </div>
      )}
    </>
  );
}
