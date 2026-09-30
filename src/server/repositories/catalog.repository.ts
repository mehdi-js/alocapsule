import type { Prisma } from "@prisma/client";

import type { Pack } from "@/lib/catalog-url";
import { db } from "@/lib/db";

/**
 * خواندن کاتالوگ عمومی. در همه‌ی کوئری‌ها فقط محصول و متغیر `isActive` و
 * محصولی که دست‌کم یک متغیر فعال دارد برگردانده می‌شود (محصول بدون متغیر فعال
 * قیمتی برای نمایش ندارد).
 *
 * 🔴 هیچ شرط یا فیلد موجودی اینجا وجود ندارد (بخش ۷.۱ سند).
 */

export const activeVariants = {
  where: { isActive: true },
  orderBy: { unitValue: "asc" as const },
};

/** تصویر اصلی اول، بعد بقیه به ترتیب چیدمان ادمین */
export const primaryFirstImages = {
  orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
};

/** محصول فعال که دست‌کم یک متغیر فعال دارد */
export const SELLABLE: Prisma.ProductWhereInput = {
  isActive: true,
  variants: { some: { isActive: true } },
};

export const cardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  unit: true,
  createdAt: true,
  variants: {
    ...activeVariants,
    select: { id: true, price: true, unitValue: true, title: true },
  },
  images: { ...primaryFirstImages, take: 1, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof cardSelect;
}>;

export interface CatalogFilters {
  /** slug دسته‌ها (خالی = همه) */
  categorySlugs: string[];
  /** بسته‌های انتخابی (واحد + مقدار) */
  packs: Pack[];
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
}

export type CatalogSort = "featured" | "newest" | "cheapest" | "expensive";

function buildWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const price: Prisma.IntFilter = {};
  if (filters.minPrice !== null) price.gte = filters.minPrice;
  if (filters.maxPrice !== null) price.lte = filters.maxPrice;

  const variant: Prisma.ProductVariantWhereInput = { isActive: true };
  if (Object.keys(price).length > 0) variant.price = price;

  // شرط‌های بسته و قیمت باید روی یک متغیر واحد صدق کنند، نه ترکیبی از چند متغیر؛
  // و مقدار بسته فقط همراه واحدش معنا دارد (۱۲ عددی ≠ ۱۲ گرم).
  const byUnit = (unit: Pack["unit"]) =>
    filters.packs
      .filter((pack) => pack.unit === unit)
      .map((pack) => pack.value);
  const packConditions: Prisma.ProductWhereInput[] = (
    ["GRAM", "PIECE"] as const
  )
    .map((unit) => ({ unit, values: byUnit(unit) }))
    .filter(({ values }) => values.length > 0)
    .map(({ unit, values }) => ({
      unit,
      variants: { some: { ...variant, unitValue: { in: values } } },
    }));

  return {
    isActive: true,
    ...(packConditions.length > 0
      ? { OR: packConditions }
      : { variants: { some: variant } }),
    ...(filters.categorySlugs.length > 0
      ? { category: { slug: { in: filters.categorySlugs } } }
      : {}),
  };
}

/** حداقل شباهت trigram برای جستجوی مقاوم به غلط تایپی */
const SEARCH_SIMILARITY = 0.5;

/**
 * جستجوی نام محصول با pg_trgm (بخش ۵ سند): ی/ک عربی یکسان و نیم‌فاصله به
 * فاصله تبدیل می‌شود؛ تطبیق زیررشته‌ای بدون فاصله‌ها + شباهت کلمه‌ای برای غلط
 * تایپی. شناسه‌ها به ترتیب مرتبط‌بودن برمی‌گردند.
 */
export async function findProductIdsBySearch(
  search: string,
): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    WITH q AS (
      SELECT translate(lower(${search}), 'يك' || chr(8204), 'یک ') AS n
    ), p AS (
      SELECT id, translate(lower(name), 'يك' || chr(8204), 'یک ') AS n
      FROM "Product"
      WHERE "isActive"
    )
    SELECT p.id
    FROM p, q
    WHERE replace(p.n, ' ', '') ILIKE '%' || replace(q.n, ' ', '') || '%'
       OR word_similarity(q.n, p.n) >= ${SEARCH_SIMILARITY}
    ORDER BY word_similarity(q.n, p.n) DESC, p.id
    LIMIT 200`;
  return rows.map((row) => row.id);
}

const LIST_ORDER: Record<
  "featured" | "newest",
  Prisma.ProductOrderByWithRelationInput[]
> = {
  featured: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
};

export async function findCatalogProducts(params: {
  filters: CatalogFilters;
  sort: CatalogSort;
  skip: number;
  take: number;
}): Promise<{ items: ProductCardRow[]; total: number }> {
  const where = buildWhere(params.filters);
  const searchIds = params.filters.search
    ? await findProductIdsBySearch(params.filters.search)
    : null;
  if (searchIds) {
    if (searchIds.length === 0) return { items: [], total: 0 };
    where.id = { in: searchIds };
  }

  // Prisma نمی‌تواند بر اساس «کمترین قیمت متغیر» یا میزان شباهت جستجو مرتب
  // کند؛ برای این حالت‌ها ترتیب پس از خواندن اعمال می‌شود. کاتالوگ این فروشگاه
  // کوچک است (ده‌ها محصول)، پس هزینه‌ی خواندن کامل ناچیز است.
  const priceSort = params.sort === "cheapest" || params.sort === "expensive";
  const relevanceSort = searchIds !== null && params.sort === "featured";

  if (priceSort || relevanceSort) {
    const all = await db.product.findMany({ where, select: cardSelect });
    if (relevanceSort) {
      const rank = new Map(searchIds.map((id, index) => [id, index]));
      all.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    } else {
      const minPriceOf = (row: ProductCardRow) =>
        row.variants.reduce(
          (min, variant) => Math.min(min, variant.price),
          Number.POSITIVE_INFINITY,
        );
      all.sort((a, b) =>
        params.sort === "cheapest"
          ? minPriceOf(a) - minPriceOf(b)
          : minPriceOf(b) - minPriceOf(a),
      );
    }
    return {
      items: all.slice(params.skip, params.skip + params.take),
      total: all.length,
    };
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      select: cardSelect,
      orderBy: LIST_ORDER[params.sort as "featured" | "newest"],
      skip: params.skip,
      take: params.take,
    }),
    db.product.count({ where }),
  ]);
  return { items, total };
}

export function findFeaturedProducts(take: number) {
  return db.product.findMany({
    where: SELLABLE,
    select: cardSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take,
  });
}

/** دسته‌های فعال همراه تعداد محصولات قابل فروش */
export async function findCategoriesWithCounts() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  const grouped = await db.product.groupBy({
    by: ["categoryId"],
    where: SELLABLE,
    _count: { _all: true },
  });
  const counts = new Map(
    grouped.map((row) => [row.categoryId, row._count._all]),
  );

  return categories.map((category) => ({
    ...category,
    productCount: counts.get(category.id) ?? 0,
  }));
}

/** بسته‌های موجود (واحد + مقدار) و بازه‌ی قیمت، برای ساخت فیلترها */
export async function findFilterBounds() {
  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    product: { isActive: true },
  };
  const [variants, aggregate] = await Promise.all([
    db.productVariant.findMany({
      where,
      select: { unitValue: true, product: { select: { unit: true } } },
    }),
    db.productVariant.aggregate({
      where,
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  const seen = new Map<string, Pack>();
  for (const variant of variants) {
    const pack = { unit: variant.product.unit, value: variant.unitValue };
    seen.set(`${pack.unit}:${pack.value}`, pack);
  }

  return {
    packs: [...seen.values()],
    minPrice: aggregate._min.price ?? 0,
    maxPrice: aggregate._max.price ?? 0,
  };
}

/** slugهای محصولات و دسته‌های فعال برای sitemap */
