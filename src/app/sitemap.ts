import type { MetadataRoute } from "next";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { SITE } from "@/lib/site-content";
import { findSitemapEntries } from "@/server/repositories/catalog-page.repository";
import { listActiveBranches } from "@/server/services/branch.service";
import { listPublishedPages } from "@/server/services/page.service";

/** با هر تغییر کاتالوگ در ادمین هم revalidate می‌شود */
export const revalidate = 3600;

/**
 * SEO.md §۸.۱: صفحه‌ی اصلی، همه‌ی محصولات، دسته‌های فعال بدون noindex،
 * محصولات بایگانی‌نشده و بدون noindex (فعال و غیرفعال)، شعب فعال و صفحات
 * ثابت منتشرشده.
 * `changefreq`/`priority` عمداً نیست (گوگل نادیده می‌گیرد). ساختار آماده‌ی
 * `generateSitemaps` برای چندتکه شدن در آینده است.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, categories }, pages, branches] = await Promise.all([
    isBuildWithoutDb()
      ? { products: [], categories: [] }
      : findSitemapEntries(),
    listPublishedPages(),
    listActiveBranches(),
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
    { url: url("/branches") },
    ...branches.map((branch) => ({
      url: url(`/branches/${branch.slug}`),
      lastModified: branch.updatedAt,
    })),
    // صفحات ثابت منتشرشده و بدون noindex (درباره ما و تماس بالاتر آمده‌اند)
    ...pages
      .filter(
        (page) =>
          !page.noindex && page.slug !== "about" && page.slug !== "contact",
      )
      .map((page) => ({
        url: url(`/${page.slug}`),
        lastModified: page.updatedAt,
      })),
  ];
}
