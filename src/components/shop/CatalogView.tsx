import Link from "next/link";
import type { ReactNode } from "react";

import { buildCatalogHref, hasActiveFilters } from "@/lib/catalog-url";
import { toPersianDigits } from "@/lib/utils";
import {
  type CatalogQuery,
  type FilterOptions,
  type ProductListPage,
  SORT_LABELS,
} from "@/server/services/catalog.service";

import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { CatalogFilters } from "./CatalogFilters";
import { ChevronDownIcon } from "./icons";
import { ProductGrid } from "./ProductCard";
import { SearchForm } from "./SearchForm";
import { ShopPagination } from "./ShopPagination";
import { SortSelect } from "./SortSelect";
import { btnPrimary, panel } from "./styles";

/**
 * بدنه‌ی مشترک «همه محصولات» و «صفحه‌ی دسته»: عنوان، مرتب‌سازی، فیلتر،
 * شبکه‌ی کارت‌ها، حالت خالی و صفحه‌بندی.
 */
export function CatalogView({
  title,
  subtitle,
  crumbs,
  query,
  result,
  options,
  basePath,
  showCategories = true,
  intro,
  children,
}: {
  title: string;
  subtitle?: string | null;
  crumbs: Crumb[];
  query: CatalogQuery;
  result: ProductListPage;
  options: FilterOptions;
  basePath: string;
  showCategories?: boolean;
  /** متن معرفی زیر عنوان (دسته) */
  intro?: ReactNode;
  /** محتوای زیر فهرست (متن پایین دسته، FAQ) */
  children?: ReactNode;
}) {
  const filtered = hasActiveFilters(query);
  const filters = (
    <CatalogFilters
      state={query}
      options={options}
      basePath={basePath}
      showCategories={showCategories}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-5 pt-6 md:gap-8 md:px-11 md:pt-8">
      <Breadcrumb items={crumbs} />

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold md:text-4xl">{title}</h1>
          <p className="text-muted text-sm">
            {toPersianDigits(result.total)} محصول
            {query.search ? ` برای «${query.search}»` : ""}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <SortSelect state={query} labels={SORT_LABELS} basePath={basePath} />
      </div>

      {intro}

      <SearchForm defaultValue={query.search} className="md:max-w-md" />

      <div className="grid items-start gap-6 lg:grid-cols-[270px_1fr]">
        {/* موبایل و تبلت: فیلترها در یک بخش جمع‌شونده */}
        <details className={`${panel} group lg:hidden`}>
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-bold">
            فیلترها
            <ChevronDownIcon
              size={16}
              className="text-accent transition group-open:rotate-180"
            />
          </summary>
          <div className="px-5 pb-5">{filters}</div>
        </details>

        <aside aria-label="فیلترها" className={`${panel} hidden p-6 lg:block`}>
          {filters}
        </aside>

        <div className="flex flex-col gap-8">
          {result.items.length > 0 ? (
            <ProductGrid products={result.items} />
          ) : (
            <div
              className={`${panel} flex flex-col items-center gap-4 px-6 py-16 text-center`}
            >
              <p className="text-lg font-bold">محصولی پیدا نشد</p>
              <p className="text-muted text-sm">
                {filtered
                  ? "با این فیلترها محصولی وجود ندارد. فیلترها را تغییر دهید یا حذف کنید."
                  : "هنوز محصولی در این بخش نیست."}
              </p>
              {filtered ? (
                <Link href={basePath} className={btnPrimary}>
                  حذف فیلترها
                </Link>
              ) : null}
            </div>
          )}

          <ShopPagination
            page={result.page}
            pageCount={result.pageCount}
            buildHref={(page) => buildCatalogHref({ ...query, page }, basePath)}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
