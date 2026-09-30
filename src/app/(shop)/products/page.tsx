import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CatalogView } from "@/components/shop/CatalogView";
import { buildCatalogHref, listingSeoState } from "@/lib/catalog-url";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site-content";
import {
  getFilterOptions,
  listCatalogProducts,
  parseCatalogQuery,
} from "@/server/services/catalog.service";
import { getSeoContext } from "@/server/services/seo-settings.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const query = parseCatalogQuery(await searchParams);
  // مرتب‌سازی/فیلتر ⇒ canonical تمیز؛ ?page=2 ⇒ خودش؛ جستجو ⇒ noindex, follow
  return buildPageMetadata(await getSeoContext(), {
    title: query.search ? `جستجوی «${query.search}»` : "همه محصولات",
    description: `شارژ و خرید آنلاین کپسول گاز از ${SITE.name}؛ ارسال با پیک در تهران یا تحویل حضوری.`,
    path: "/products",
    listing: listingSeoState(query),
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [result, options] = await Promise.all([
    listCatalogProducts(query),
    getFilterOptions(),
  ]);

  if (result.items.length === 0 && query.page > result.pageCount) {
    redirect(buildCatalogHref({ ...query, page: result.pageCount }));
  }

  return (
    <CatalogView
      title="همه محصولات"
      subtitle="شارژ کپسول، خرید کپسول و لوازم پیک‌نیک"
      crumbs={[{ label: "خانه", href: "/" }, { label: "همه محصولات" }]}
      query={query}
      result={result}
      options={options}
      basePath="/products"
    />
  );
}
