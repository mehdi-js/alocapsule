import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { CatalogView } from "@/components/shop/CatalogView";
import { FaqSection } from "@/components/shop/FaqSection";
import { PriceTable } from "@/components/shop/PriceTable";
import { RichText } from "@/components/ui/RichText";
import { buildCatalogHref, listingSeoState } from "@/lib/catalog-url";
import { formatJalali } from "@/lib/date";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
} from "@/lib/seo/jsonld";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { safeDecode } from "@/lib/utils";
import {
  getFilterOptions,
  listCatalogProducts,
  parseCatalogQuery,
} from "@/server/services/catalog.service";
import {
  type CategoryPageDto,
  getCategoryPage,
  getCategoryPriceTable,
} from "@/server/services/catalog-page.service";
import { getSeoContext } from "@/server/services/seo-settings.service";
import { getBusinessSettings } from "@/server/services/store-content.service";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const loadCategory = cache(async (params: Params) => {
  const { slug } = await params;
  return getCategoryPage(safeDecode(slug));
});

/** نامک قدیمی ⇒ ریدایرکت دائمی به نامک فعلی؛ نبود ⇒ ۴۰۴ واقعی */
async function requireCategory(params: Params): Promise<CategoryPageDto> {
  const lookup = await loadCategory(params);
  if (lookup.kind === "redirect") permanentRedirect(lookup.to);
  if (lookup.kind === "missing") notFound();
  return lookup.data;
}

function pageText(category: CategoryPageDto): string {
  return [category.introText, category.bottomContent]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const lookup = await loadCategory(params);
  if (lookup.kind !== "found") return {};
  const category = lookup.data;
  const query = parseCatalogQuery(await searchParams);
  return buildCategoryMetadata(
    await getSeoContext(),
    { ...category, text: pageText(category) || category.description },
    listingSeoState(query),
  );
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const category = await requireCategory(params);

  const basePath = `/category/${category.slug}`;
  // دسته از مسیر آدرس تعیین می‌شود، نه از query
  const query = { ...parseCatalogQuery(await searchParams), categorySlugs: [] };
  const [result, options, context, priceTable, business] = await Promise.all([
    listCatalogProducts({ ...query, categorySlugs: [category.slug] }),
    getFilterOptions(),
    getSeoContext(),
    getCategoryPriceTable(category.id),
    getBusinessSettings(),
  ]);

  if (result.items.length === 0 && query.page > result.pageCount) {
    redirect(buildCatalogHref({ ...query, page: result.pageCount }, basePath));
  }

  const crumbs = [
    { name: "خانه", path: "/" },
    ...category.parents,
    { name: category.name, path: basePath },
  ];
  // متن معرفی و متن پایین فقط در صفحه‌ی اصلی دسته (نه صفحه‌ی ۲ یا فیلترشده)
  const firstPage = query.page === 1 && !listingSeoState(query).filtered;
  // «قیمت شارژ کپسول گاز» → «جدول قیمت شارژ کپسول گاز»
  const heading = category.h1 ?? category.name;
  const tableTitle = heading.startsWith("قیمت")
    ? `جدول ${heading}`
    : `جدول قیمت ${heading}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, context.siteUrl),
          itemListJsonLd(
            result.items.map((item) => ({
              name: item.name,
              path: `/products/${item.slug}`,
            })),
            context.siteUrl,
          ),
          firstPage ? faqPageJsonLd(category.faq) : null,
        ]}
      />
      <CatalogView
        title={category.name}
        subtitle={category.description}
        crumbs={crumbs.map((crumb, index) => ({
          label: crumb.name,
          href: index < crumbs.length - 1 ? crumb.path : undefined,
        }))}
        query={query}
        result={result}
        options={options}
        basePath={basePath}
        showCategories={false}
        intro={
          firstPage && category.introText ? (
            <p className="text-ink-soft max-w-[860px] text-[15px] leading-[2.1]">
              {category.introText}
            </p>
          ) : null
        }
      >
        {firstPage && priceTable ? (
          <PriceTable
            table={priceTable.table}
            mode="category"
            id="price-table"
            caption={tableTitle}
            note={
              priceTable.kind === "SERVICE"
                ? business.priceIncludesNote
                : business.priceIncludesNoteProducts
            }
            updatedLabel={
              priceTable.priceUpdatedAt
                ? formatJalali(priceTable.priceUpdatedAt, "YYYY/MM/DD")
                : null
            }
          />
        ) : null}
        {firstPage && category.bottomContent ? (
          <section className="text-ink-soft max-w-[860px] text-[15px]">
            <RichText text={category.bottomContent} headingLevel={2} />
          </section>
        ) : null}
        {firstPage ? (
          <FaqSection items={category.faq} id="category-faq" />
        ) : null}
      </CatalogView>
    </>
  );
}
