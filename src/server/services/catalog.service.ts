import type { PricingMode, ProductKind } from "@prisma/client";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { comparePacks, packKey, parsePackKey } from "@/lib/catalog-url";
import { thumbnailUrl } from "@/lib/image/urls";
import { getVariantTitle, resolveVariantTitle } from "@/lib/unit";
import {
  type CatalogFilters,
  type CatalogSort,
  findCatalogProducts,
  findCategoriesWithCounts,
  findFeaturedProducts,
  findFilterBounds,
  type ProductCardRow,
} from "@/server/repositories/catalog.repository";

export const PRODUCTS_PAGE_SIZE = 9;
export const FEATURED_COUNT = 4;
/** محصول ساخته‌شده در این بازه، برچسب «جدید» می‌گیرد */
const NEW_BADGE_DAYS = 30;

export interface ProductCardDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  /** خدمت (مثل شارژ) یا کالای فیزیکی */
  kind: ProductKind;
  /** استعلامی ⇒ به‌جای قیمت «استعلام قیمت» و بدون افزودن به سبد */
  pricingMode: PricingMode;
  /** کمترین قیمت بین متغیرهای فعال؛ `null` برای محصول استعلامی */
  price: number | null;
  /** برای محصول چند متغیره، قیمت «از» است */
  hasRange: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  badge: "جدید" | null;
  /** برای انتخاب سریع متغیر روی کارت */
  variants: { id: string; title: string; price: number }[];
}

export interface CatalogVariantDto {
  id: string;
  unitValue: number;
  title: string;
  price: number;
  comparePrice: number | null;
  pricePerKg: number | null;
}

function isNew(createdAt: Date): boolean {
  return (
    Date.now() - createdAt.getTime() < NEW_BADGE_DAYS * 24 * 60 * 60 * 1000
  );
}

export function toProductCard(row: ProductCardRow): ProductCardDto {
  const prices = row.variants.map((variant) => variant.price);
  const image = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    kind: row.kind,
    pricingMode: row.pricingMode,
    price:
      row.pricingMode === "INQUIRY" || prices.length === 0
        ? null
        : Math.min(...prices),
    hasRange: new Set(prices).size > 1,
    imageUrl: image ? thumbnailUrl(image.url) : null,
    imageAlt: image?.alt ?? null,
    badge: isNew(row.createdAt) ? "جدید" : null,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      title: resolveVariantTitle(row.unit, variant.unitValue, variant.title),
      price: variant.price,
    })),
  };
}

// ───────── فهرست و فیلتر ─────────

export interface CatalogQuery extends Omit<CatalogFilters, "packs"> {
  /** کلیدهای بسته در URL (`g500`, `p12`) */
  packKeys: string[];
  sort: CatalogSort;
  page: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

function toList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

const SORTS: CatalogSort[] = ["featured", "newest", "cheapest", "expensive"];

export const SORT_LABELS: Record<CatalogSort, string> = {
  featured: "منتخب فروشگاه",
  newest: "جدیدترین",
  cheapest: "ارزان‌ترین",
  expensive: "گران‌ترین",
};

/** پارامترهای URL فهرست محصولات؛ مقدار نامعتبر به پیش‌فرض برمی‌گردد. */
export function parseCatalogQuery(params: SearchParams): CatalogQuery {
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort = SORTS.find((item) => item === sortRaw) ?? "featured";
  const page = toPositiveInt(params.page);
  const search = (Array.isArray(params.q) ? params.q[0] : params.q) ?? "";
  const min = toPositiveInt(params.min);
  const max = toPositiveInt(params.max);

  return {
    categorySlugs: toList(params.category).slice(0, 20),
    // کلید نامعتبر نادیده گرفته می‌شود
    packKeys: toList(params.weight)
      .filter((key) => parsePackKey(key) !== null)
      .slice(0, 20),
    // بازه‌ی وارونه نادیده گرفته می‌شود
    minPrice: min !== null && max !== null && min > max ? null : min,
    maxPrice: min !== null && max !== null && min > max ? null : max,
    search: search.trim().slice(0, 100),
    sort,
    page: page && page > 0 ? page : 1,
  };
}

export interface ProductListPage {
  items: ProductCardDto[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listCatalogProducts(
  query: CatalogQuery,
): Promise<ProductListPage> {
  const { packKeys, ...filters } = query;
  const { items, total } = await findCatalogProducts({
    filters: {
      ...filters,
      packs: packKeys.flatMap((key) => parsePackKey(key) ?? []),
    },
    sort: query.sort,
    skip: (query.page - 1) * PRODUCTS_PAGE_SIZE,
    take: PRODUCTS_PAGE_SIZE,
  });
  return {
    items: items.map(toProductCard),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE)),
  };
}

export interface FilterOptions {
  categories: {
    id: string;
    name: string;
    slug: string;
    productCount: number;
  }[];
  /** بسته‌ها: اول وزنی، بعد تعدادی */
  packs: { key: string; label: string }[];
  minPrice: number;
  maxPrice: number;
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [categories, bounds] = await Promise.all([
    findCategoriesWithCounts(),
    findFilterBounds(),
  ]);
  return {
    categories,
    packs: [...bounds.packs].sort(comparePacks).map((pack) => ({
      key: packKey(pack),
      label: getVariantTitle(pack.unit, pack.value),
    })),
    minPrice: bounds.minPrice,
    maxPrice: bounds.maxPrice,
  };
}

// ───────── صفحه‌ی محصول ─────────

export async function listFeaturedProducts(): Promise<ProductCardDto[]> {
  // build بدون دیتابیس (Docker): پس از راه‌اندازی با /api/revalidate تازه می‌شود
  if (isBuildWithoutDb()) return [];
  const rows = await findFeaturedProducts(FEATURED_COUNT);
  return rows.map(toProductCard);
}
