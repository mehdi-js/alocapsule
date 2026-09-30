import type { PricingMode, ProductKind, ProductUnit } from "@prisma/client";

import { analyzeSeo, type SeoSummary, summarizeSeo } from "@/lib/seo/analyze";
import { findSeoConflicts } from "@/lib/seo/conflicts";
import { parseFaq } from "@/lib/seo/faq";
import type { FaqItem } from "@/lib/validation/seo";
import {
  findProductById,
  listProductLinks,
  listProductsForAdmin,
  productHasOrders,
} from "@/server/repositories/product.repository";
import { listSeoIndex } from "@/server/repositories/seo.repository";

import { listCategories } from "./category.service";
import { type ProductImageDto, toImageDto } from "./product-image.service";
import { getTitleSettings } from "./seo-settings.service";

/** خواندن محصولات برای پنل ادمین (لیست با فیلتر + فرم ویرایش) */

export const ADMIN_PRODUCTS_PAGE_SIZE = 20;

// ───────── DTOها ─────────

export interface ProductListParams {
  q: string;
  categoryId: string;
  status: "all" | "active" | "inactive" | "archived";
  /** خالی = همه */
  kind: ProductKind | "";
  pricingMode: PricingMode | "";
  page: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  unit: ProductUnit;
  kind: ProductKind;
  pricingMode: PricingMode;
  isActive: boolean;
  variantCount: number;
  activeVariantCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  archived: boolean;
  /** مقصد پیش‌فرض ریدایرکت بایگانی (دسته‌ی محصول) */
  categorySlug: string;
  seo: SeoSummary;
}

export interface ProductListPage {
  items: ProductListItem[];
  total: number;
  page: number;
  pageCount: number;
}

export interface VariantDto {
  id: string;
  unitValue: number;
  title: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  shippingWeightGrams: number;
  isActive: boolean;
}

export interface ProductEditDto {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  unit: ProductUnit;
  kind: ProductKind;
  pricingMode: PricingMode;
  /** فقط برای خدمت؛ خالی ⇒ متن پیش‌فرض `service.defaultTerms` */
  serviceTerms: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  noindex: boolean;
  canonicalUrl: string | null;
  faq: FaqItem[];
  /** بایگانی‌شده ⇒ آدرسش 301 به `archiveRedirectTo` */
  archivedAt: Date | null;
  archiveRedirectTo: string | null;
  sortOrder: number;
  isActive: boolean;
  /** پس از اولین سفارش، `unit` قفل است */
  hasOrders: boolean;
  variants: VariantDto[];
  /** به ترتیب نمایش */
  images: ProductImageDto[];
}

type SearchParams = Record<string, string | string[] | undefined>;

/** مقدار نامعتبر ⇒ خالی (بدون فیلتر) */
function parseEnum<T extends string>(
  value: string,
  allowed: readonly T[],
): T | "" {
  return allowed.find((item) => item === value) ?? "";
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** پارامترهای URL لیست محصولات؛ مقدار نامعتبر به پیش‌فرض برمی‌گردد. */
export function parseProductListParams(
  params: SearchParams,
): ProductListParams {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).slice(0, 100),
    categoryId: first(params.category),
    status:
      status === "active" || status === "inactive" || status === "archived"
        ? status
        : "all",
    kind: parseEnum(first(params.kind), ["PHYSICAL", "SERVICE"]),
    pricingMode: parseEnum(first(params.pricing), ["FIXED", "INQUIRY"]),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

// ───────── خواندن ─────────

export async function listProducts(
  params: ProductListParams,
): Promise<ProductListPage> {
  const [{ items, total }, seoIndex, titleSettings] = await Promise.all([
    listProductsForAdmin({
      q: params.q || undefined,
      categoryId: params.categoryId || undefined,
      status: params.status,
      kind: params.kind || undefined,
      pricingMode: params.pricingMode || undefined,
      skip: (params.page - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
      take: ADMIN_PRODUCTS_PAGE_SIZE,
    }),
    listSeoIndex(),
    getTitleSettings(),
  ]);

  return {
    items: items.map((product) => {
      const prices = product.variants.map((variant) => variant.price);
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        categoryName: product.category.name,
        unit: product.unit,
        kind: product.kind,
        pricingMode: product.pricingMode,
        isActive: product.isActive,
        variantCount: product.variants.length,
        activeVariantCount: product.variants.filter((v) => v.isActive).length,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        archived: product.archivedAt !== null,
        categorySlug: product.category.slug,
        seo: summarizeSeo(
          analyzeSeo({
            name: product.name,
            seoTitle: product.seoTitle,
            metaDescription: product.metaDescription,
            focusKeyword: product.focusKeyword,
            text: product.description,
            images: product.images,
            noindex: product.noindex,
            titleSettings,
            conflicts: findSeoConflicts(seoIndex, {
              ...product,
              kind: "product",
            }),
          }),
        ),
      };
    }),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PRODUCTS_PAGE_SIZE)),
  };
}

export async function getProductForEdit(
  id: string,
): Promise<ProductEditDto | null> {
  const product = await findProductById(id);
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    unit: product.unit,
    kind: product.kind,
    pricingMode: product.pricingMode,
    serviceTerms: product.serviceTerms,
    shortDescription: product.shortDescription,
    description: product.description,
    seoTitle: product.seoTitle,
    metaDescription: product.metaDescription,
    focusKeyword: product.focusKeyword,
    secondaryKeywords: product.secondaryKeywords,
    noindex: product.noindex,
    canonicalUrl: product.canonicalUrl,
    faq: parseFaq(product.faq),
    archivedAt: product.archivedAt,
    archiveRedirectTo: product.archiveRedirectTo,
    sortOrder: product.sortOrder,
    isActive: product.isActive,
    hasOrders: await productHasOrders(id),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      unitValue: variant.unitValue,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      comparePrice: variant.comparePrice,
      shippingWeightGrams: variant.shippingWeightGrams,
      isActive: variant.isActive,
    })),
    images: product.images.map(toImageDto),
  };
}

export interface ArchiveTarget {
  label: string;
  path: string;
}

/** گزینه‌های مقصد ریدایرکت هنگام بایگانی: دسته‌ها، محصولات و همه‌ی محصولات */
export async function listArchiveTargets(): Promise<{
  categories: ArchiveTarget[];
  products: (ArchiveTarget & { id: string })[];
}> {
  const [categories, products] = await Promise.all([
    listCategories(),
    listProductLinks(),
  ]);
  return {
    categories: [
      { label: "همه‌ی محصولات", path: "/products" },
      ...categories.map((category) => ({
        label: `${"— ".repeat(category.depth)}${category.name}`,
        path: `/category/${category.slug}`,
      })),
    ],
    products: products.map((product) => ({
      id: product.id,
      label: product.name,
      path: `/products/${product.slug}`,
    })),
  };
}
