import type { MetadataRoute } from "next";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { SITE } from "@/lib/site-content";
import { findSitemapEntries } from "@/server/repositories/catalog-page.repository";
import { listPublishedPages } from "@/server/services/page.service";

/** با هر تغییر کاتالوگ در ادمین هم revalidate می‌شود */
export const revalidate = 3600;

/**
 * SEO.md §۸: `/`، `/products`، دسته‌های hub (فعال و بدون noindex)، صفحه‌های
 * محصول بدون noindex (بایگانی‌نشده)، `/about`، `/contact` و صفحات `terms` و
 * `privacy` (فقط اگر منتشر شده‌اند). **نه** دسته‌های noindex، **نه** URLهای دارای
 * پارامتر گزینه (`?valve=…`)، **نه** صفحه‌های شعب و بقیه‌ی صفحات ثابت.
 * `changefreq`/`priority` عمداً نیست (گوگل نادیده می‌گیرد).
 */
const SITEMAP_PAGE_SLUGS = ["terms", "privacy"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, categories }, pages] = await Promise.all([
    isBuildWithoutDb()
      ? { products: [], categories: [] }
      : findSitemapEntries(),
    listPublishedPages(),
  ]);
  const url = (path: string) => new URL(path, SITE.url).toString();

  return [
    { url: url("/") },
    { url: url("/products") },
    ...categories.map((category) => ({
      url: url(`/category/${category.slug}`),
      lastModified: category.updatedAt,
    })),
    ...products.map((product) => ({
      url: url(`/products/${product.slug}`),
      lastModified: product.updatedAt,
    })),
    { url: url("/about") },
    { url: url("/contact") },
    ...pages
      .filter(
        (page) =>
          !page.noindex &&
          (SITEMAP_PAGE_SLUGS as readonly string[]).includes(page.slug),
      )
      .map((page) => ({
        url: url(`/${page.slug}`),
        lastModified: page.updatedAt,
      })),
  ];
}
