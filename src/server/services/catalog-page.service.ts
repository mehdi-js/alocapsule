import type { ProductUnit } from "@prisma/client";
import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { thumbnailUrl } from "@/lib/image/urls";
import { parseFaq } from "@/lib/seo/faq";
import { calculatePricePerKg, resolveVariantTitle } from "@/lib/unit";
import type { FaqItem } from "@/lib/validation/seo";
import {
  findActiveCategoryPageRow,
  findCategoryRedirectInfo,
  findProductPageRow,
  findProductRedirectInfo,
  findSellableInCategories,
  findSlugHistoryTarget,
  listCategoryTree,
  listTopCategories,
} from "@/server/repositories/catalog-page.repository";

import { type ProductCardDto, toProductCard } from "./catalog.service";

/**
 * داده‌ی صفحه‌ی محصول و دسته با قواعد سئو:
 * - محصول غیرفعال ⇒ صفحه‌ی 200 با «قابل سفارش نیست» (SEO.md §۴.۳)
 * - محصول بایگانی ⇒ ریدایرکت دائمی به مقصد ادمین
 * - نامک قدیمی (SlugHistory) ⇒ ریدایرکت دائمی به نامک فعلی (§۱۱.۱)
 */

export const RELATED_COUNT = 4;

export type PageLookup<T> =
  | { kind: "found"; data: T }
  | { kind: "redirect"; to: string }
  | { kind: "missing" };

export interface CatalogVariantDto {
  id: string;
  unitValue: number;
  title: string;
  price: number;
  comparePrice: number | null;
  pricePerKg: number | null;
  sku: string | null;
}

export interface Crumb {
  name: string;
  path: string;
}

export interface ProductPageDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  unit: ProductUnit;
  seoTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  canonicalUrl: string | null;
  faq: FaqItem[];
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  /** دسته‌ها از ریشه تا دسته‌ی محصول (breadcrumb) */
  categoryTrail: Crumb[];
  images: {
    url: string;
    thumbUrl: string;
    alt: string;
    ogUrl: string | null;
    width: number | null;
    height: number | null;
  }[];
  /** متغیرهای فعال (قابل انتخاب) */
  variants: CatalogVariantDto[];
  /** قابل سفارش: محصول فعال با حداقل یک متغیر فعال */
  available: boolean;
  /** قیمت‌های schema: فعال‌ها، یا برای محصول ناموجود همه‌ی متغیرها */
  schemaVariants: { price: number; sku: string | null }[];
}

type CategoryNode = Awaited<ReturnType<typeof listCategoryTree>>[number];

/** زنجیره‌ی دسته‌ها از ریشه تا `categoryId` (حلقه‌ی خراب ⇒ توقف) */
export function categoryTrail(
  categories: CategoryNode[],
  categoryId: string,
): CategoryNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const trail: CategoryNode[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}

function toCrumbs(trail: CategoryNode[]): Crumb[] {
  return trail
    .filter((category) => category.isActive)
    .map((category) => ({
      name: category.name,
      path: `/category/${category.slug}`,
    }));
}

async function productRedirectFor(id: string): Promise<string | null> {
  const product = await findProductRedirectInfo(id);
  if (!product) return null;
  if (product.archivedAt) {
    return product.archiveRedirectTo ?? `/category/${product.category.slug}`;
  }
  return `/products/${product.slug}`;
}

export async function getProductPage(
  slug: string,
): Promise<PageLookup<ProductPageDto>> {
  const row = await findProductPageRow(slug);
  if (!row) {
    const id = await findSlugHistoryTarget("PRODUCT", slug);
    const to = id ? await productRedirectFor(id) : null;
    return to ? { kind: "redirect", to } : { kind: "missing" };
  }
  if (row.archivedAt) {
    return {
      kind: "redirect",
      to: row.archiveRedirectTo ?? `/category/${row.category.slug}`,
    };
  }

  const active = row.variants.filter((variant) => variant.isActive);
  const available = row.isActive && active.length > 0;
  const trail = categoryTrail(await listCategoryTree(), row.categoryId);

  return {
    kind: "found",
    data: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortDescription: row.shortDescription,
      description: row.description,
      unit: row.unit,
      seoTitle: row.seoTitle,
      metaDescription: row.metaDescription,
      noindex: row.noindex,
      canonicalUrl: row.canonicalUrl,
      faq: parseFaq(row.faq),
      categoryId: row.categoryId,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      categoryTrail: toCrumbs(trail),
      images: row.images.map((image) => ({
        url: image.url,
        thumbUrl: thumbnailUrl(image.url),
        alt: image.alt,
        ogUrl: image.ogUrl,
        width: image.width,
        height: image.height,
      })),
      variants: active.map((variant) => ({
        id: variant.id,
        unitValue: variant.unitValue,
        title: resolveVariantTitle(row.unit, variant.unitValue, variant.title),
        price: variant.price,
        comparePrice: variant.comparePrice,
        pricePerKg: calculatePricePerKg(
          row.unit,
          variant.price,
          variant.unitValue,
        ),
        sku: variant.sku,
      })),
      available,
      schemaVariants: (available ? active : row.variants).map((variant) => ({
        price: variant.price,
        sku: variant.sku,
      })),
    },
  };
}

/**
 * محصولات مرتبط (SEO.md §۱۲): محصولات فعال همان دسته، سپس دسته‌ی والد.
 */
export async function listRelatedProducts(
  product: Pick<ProductPageDto, "id" | "categoryId">,
): Promise<ProductCardDto[]> {
  const trail = categoryTrail(await listCategoryTree(), product.categoryId);
  const order = [product.categoryId];
  const parent = trail.at(-2);
  if (parent) order.push(parent.id);

  const rows = await findSellableInCategories({
    categoryIds: order,
    excludeId: product.id,
    take: RELATED_COUNT,
  });
  return [...rows]
    .sort((a, b) => order.indexOf(a.categoryId) - order.indexOf(b.categoryId))
    .slice(0, RELATED_COUNT)
    .map(toProductCard);
}

export interface CategoryPageDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  introText: string | null;
  bottomContent: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  faq: FaqItem[];
  /** دسته‌های والد (بدون خود دسته) */
  parents: Crumb[];
}

export async function getCategoryPage(
  slug: string,
): Promise<PageLookup<CategoryPageDto>> {
  const row = await findActiveCategoryPageRow(slug);
  if (!row) {
    const id = await findSlugHistoryTarget("CATEGORY", slug);
    const target = id ? await findCategoryRedirectInfo(id) : null;
    return target?.isActive
      ? { kind: "redirect", to: `/category/${target.slug}` }
      : { kind: "missing" };
  }
  const trail = categoryTrail(await listCategoryTree(), row.id);
  return {
    kind: "found",
    data: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      introText: row.introText,
      bottomContent: row.bottomContent,
      seoTitle: row.seoTitle,
      metaDescription: row.metaDescription,
      noindex: row.noindex,
      faq: parseFaq(row.faq),
      parents: toCrumbs(trail.slice(0, -1)),
    },
  };
}

/** لینک دسته‌های اصلی در فوتر (SEO.md §۱۲) */
export const getFooterCategories = cache(
  async (): Promise<{ name: string; path: string }[]> => {
    if (isBuildWithoutDb()) return [];
    const categories = await listTopCategories();
    return categories.map((category) => ({
      name: category.name,
      path: `/category/${category.slug}`,
    }));
  },
);
