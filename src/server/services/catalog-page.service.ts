import type { PricingMode, ProductKind, ProductUnit } from "@prisma/client";
import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { thumbnailUrl } from "@/lib/image/urls";
import {
  buildPriceTable,
  type PageOption,
  type PriceTable,
  type SelectableVariant,
  type TableProduct,
} from "@/lib/option-selection";
import { parseOptionKey, type Selection } from "@/lib/product-options";
import {
  orderRelated,
  parseRelatedRules,
  RELATED_RULES_KEY,
} from "@/lib/related-rules";
import { parseFaq } from "@/lib/seo/faq";
import { buildShippingInfo, type ShippingInfoItem } from "@/lib/shipping-info";
import { calculatePricePerKg, resolveVariantTitle } from "@/lib/unit";
import type { FaqItem } from "@/lib/validation/seo";
import {
  findActiveCategoryPageRow,
  findCategoryRedirectInfo,
  findCategoryTableProducts,
  findFeaturedCategories,
  findFirstSellableSlug,
  findProductPageRow,
  findProductRedirectInfo,
  findSellableCards,
  findSellableInCategories,
  findSlugHistoryTarget,
  listCategoryTree,
  listTopCategories,
} from "@/server/repositories/catalog-page.repository";
import { getSetting } from "@/server/repositories/setting.repository";
import { listActiveShippingMethods } from "@/server/repositories/shipping.repository";

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

export interface CatalogVariantDto extends SelectableVariant {
  id: string;
  unitValue: number | null;
  title: string;
  price: number;
  comparePrice: number | null;
  pricePerKg: number | null;
  sku: string | null;
  /** کد گروه ⇒ کد مقدار؛ محصول بدون گزینه `{}` */
  selection: Selection;
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
  unit: ProductUnit | null;
  kind: ProductKind;
  /** استعلامی ⇒ بدون متغیر/قیمت/افزودن به سبد؛ جعبه‌ی «استعلام قیمت» */
  pricingMode: PricingMode;
  /** متن اختصاصی شرایط خدمت؛ خالی ⇒ متن پیش‌فرض `service.defaultTerms` */
  serviceTerms: string | null;
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
  /** دسته noindex است ⇒ breadcrumb به‌جای دسته «محصولات» دارد (SEO.md §۵.۳) */
  categoryNoindex: boolean;
  /** محصول متناظر (دوطرفه) برای محصولات مرتبط */
  pairedProductId: string | null;
  images: {
    url: string;
    thumbUrl: string;
    alt: string;
    ogUrl: string | null;
    width: number | null;
    height: number | null;
  }[];
  /** گروه‌های گزینه با مقدارهای فعال، به ترتیب نمایش؛ بدون گزینه ⇒ `[]` */
  options: PageOption[];
  /** آخرین تغییر قیمت هر ترکیب (`Product.priceUpdatedAt`) */
  priceUpdatedAt: Date | null;
  /** متغیرهای فعال (قابل انتخاب) به ترتیب ادمین */
  variants: CatalogVariantDto[];
  /** نمایش‌پذیر: قیمت‌دار با حداقل یک متغیر فعال، یا استعلامی (فعال) */
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

/** همه‌ی مقدارهای کلید ترکیب در مقدارهای فعال گروه‌ها هستند (گروه‌های قدیمی/بدون گزینه ⇒ درست) */
function hasOnlyActiveValues(
  options: readonly PageOption[],
  optionKey: string,
): boolean {
  const selection = parseOptionKey(optionKey);
  return Object.entries(selection).every(([code, value]) =>
    options
      .find((option) => option.code === code)
      ?.values.some((item) => item.code === value),
  );
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

  const options: PageOption[] = row.options.map((option) => ({
    code: option.code,
    name: option.name,
    values: option.values.map((value) => ({
      code: value.code,
      label: value.label,
    })),
  }));
  // ترکیبی که مقدار غیرفعال دارد قابل فروش نیست (حتی اگر خودش فعال مانده باشد)
  const active = row.variants.filter(
    (variant) =>
      variant.isActive && hasOnlyActiveValues(options, variant.optionKey),
  );
  const inquiry = row.pricingMode === "INQUIRY";
  const available = row.isActive && (inquiry || active.length > 0);
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
      kind: row.kind,
      pricingMode: row.pricingMode,
      serviceTerms: row.serviceTerms,
      seoTitle: row.seoTitle,
      metaDescription: row.metaDescription,
      noindex: row.noindex,
      canonicalUrl: row.canonicalUrl,
      faq: parseFaq(row.faq),
      categoryId: row.categoryId,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      categoryTrail: toCrumbs(trail),
      categoryNoindex: row.category.noindex,
      pairedProductId: row.pairedProductId,
      images: row.images.map((image) => ({
        url: image.url,
        thumbUrl: thumbnailUrl(image.url),
        alt: image.alt,
        ogUrl: image.ogUrl,
        width: image.width,
        height: image.height,
      })),
      // استعلامی متغیر قابل‌فروش ندارد (حتی اگر متغیر غیرفعال قدیمی مانده باشد)
      options: inquiry ? [] : options,
      priceUpdatedAt: row.priceUpdatedAt,
      variants: (inquiry ? [] : active).map((variant) => ({
        id: variant.id,
        unitValue: variant.unitValue,
        selection: parseOptionKey(variant.optionKey),
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
      // 🔴 قیمت ساختگی ممنوع: برای استعلامی offers تولید نمی‌شود
      schemaVariants: (inquiry ? [] : available ? active : row.variants).map(
        (variant) => ({
          price: variant.price,
          sku: variant.sku,
        }),
      ),
    },
  };
}

/**
 * محصولات مرتبط (SEO.md §۵.۳): ۱) محصول متناظر، ۲) موردهای قاعده‌ی دسته
 * (`catalog.relatedRules`: مثلاً پیک‌نیک، کپسول دست دوم، hub شارژ)، ۳) بقیه‌ی
 * محصولات همان دسته، سپس دسته‌ی والد. فقط محصول قابل‌فروش (غیرفعال نمی‌آید).
 */
export async function listRelatedProducts(
  product: Pick<
    ProductPageDto,
    "id" | "categoryId" | "categorySlug" | "pairedProductId"
  >,
): Promise<ProductCardDto[]> {
  const [tree, rulesRaw] = await Promise.all([
    listCategoryTree(),
    isBuildWithoutDb() ? null : getSetting(RELATED_RULES_KEY),
  ]);
  const trail = categoryTrail(tree, product.categoryId);
  const order = [product.categoryId];
  const parent = trail.at(-2);
  if (parent) order.push(parent.id);

  const refs = parseRelatedRules(rulesRaw)[product.categorySlug] ?? [];
  const [paired, ruleGroups, sameCategory] = await Promise.all([
    product.pairedProductId
      ? findSellableCards({ id: product.pairedProductId }, 1)
      : Promise.resolve([]),
    Promise.all(
      refs.map((ref) =>
        findSellableCards(
          ref.kind === "product"
            ? { slug: ref.slug }
            : { category: { slug: ref.slug } },
          RELATED_COUNT,
        ),
      ),
    ),
    findSellableInCategories({
      categoryIds: order,
      excludeId: product.id,
      take: RELATED_COUNT,
    }).then((rows) =>
      [...rows].sort(
        (a, b) => order.indexOf(a.categoryId) - order.indexOf(b.categoryId),
      ),
    ),
  ]);
  return orderRelated(
    product.id,
    [paired, ...ruleGroups, sameCategory],
    RELATED_COUNT,
  ).map(toProductCard);
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
  /** H1 اختیاری (`Category.h1`)؛ خالی ⇒ نام دسته */
  h1: string | null;
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
      h1: row.h1,
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

/**
 * اطلاعات ارسال برای ردیف اطلاعات صفحه‌ی محصول — از داده‌ی `ShippingMethod`،
 * نه متن ثابت: آستانه‌ی ارسال رایگان تعدادی (کمترین بین روش‌های هزینه‌دار با
 * آدرس) و وجود تحویل حضوری.
 */
/**
 * اطلاعات ارسال برای ردیف اطلاعات صفحه‌ی محصول — از داده‌ی `ShippingMethod`
 * (روش‌های فعال)، نه متن ثابت؛ غیرفعال‌کردن یک روش آن را از ردیف حذف می‌کند.
 */
export async function getProductShippingInfo(
  pickupHours: string,
): Promise<ShippingInfoItem[]> {
  if (isBuildWithoutDb()) return [];
  const methods = await listActiveShippingMethods();
  return buildShippingInfo(methods, pickupHours);
}

export interface CategoryTableProduct extends TableProduct {
  id: string;
  kind: ProductKind;
  priceUpdatedAt: Date | null;
}

/**
 * محصولات قیمت‌دار فعال یک دسته برای جدول قیمت و سوییچ اندازه. ترکیبی که
 * مقدار غیرفعال دارد در جدول نمی‌آید.
 */
export async function listCategoryTableProducts(
  categoryId: string,
): Promise<CategoryTableProduct[]> {
  if (isBuildWithoutDb()) return [];
  const rows = await findCategoryTableProducts(categoryId);
  return rows.map((row) => {
    const options: PageOption[] = row.options;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      priceUpdatedAt: row.priceUpdatedAt,
      options,
      variants: row.variants
        .filter((variant) => hasOnlyActiveValues(options, variant.optionKey))
        .map((variant) => ({
          selection: parseOptionKey(variant.optionKey),
          price: variant.price,
        })),
    };
  });
}

export interface CategoryPriceTableDto {
  table: PriceTable;
  /** خدمت (شارژ) یا کالا ⇒ جمله‌ی بالای جدول */
  kind: ProductKind;
  /** جدیدترین `priceUpdatedAt` محصولات جدول */
  priceUpdatedAt: Date | null;
}

/**
 * جدول قیمت صفحه‌ی دسته (hub). کمتر از دو ردیف ⇒ `null` (جدول بی‌معنی است؛
 * صفحه‌ی همان محصول قیمت‌ها را نشان می‌دهد).
 */
export async function getCategoryPriceTable(
  categoryId: string,
): Promise<CategoryPriceTableDto | null> {
  const products = await listCategoryTableProducts(categoryId);
  const table = buildPriceTable(products);
  if (table.rows.length < 2) return null;
  const tabled = products.filter((product) =>
    table.rows.some((row) => row.key.split("|")[0] === product.slug),
  );
  const dates = tabled.flatMap((product) =>
    product.priceUpdatedAt ? [product.priceUpdatedAt.getTime()] : [],
  );
  return {
    table,
    kind: tabled.every((product) => product.kind === "SERVICE")
      ? "SERVICE"
      : "PHYSICAL",
    priceUpdatedAt: dates.length > 0 ? new Date(Math.max(...dates)) : null,
  };
}

export interface FeaturedCategoryDto {
  id: string;
  name: string;
  path: string;
  description: string | null;
}

/**
 * دسته‌های بخش «دسته‌بندی‌ها»ی صفحه‌ی اصلی؛ از دیتابیس، نه فهرست ثابت در کد
 * (SEO.md §۵.۲). hub ⇒ لینک صفحه‌ی دسته؛ دسته‌ی noindex (دست دوم، پیک‌نیک،
 * سایر گازها) ⇒ لینک مستقیم اولین محصول قابل‌فروش، و بدون محصول قابل‌فروش کارتی
 * نمی‌آید (صفحه‌ی محصولِ غیرفعال «قابل سفارش نیست» است).
 */
export const listFeaturedCategories = cache(
  async (): Promise<FeaturedCategoryDto[]> => {
    if (isBuildWithoutDb()) return [];
    const categories = await findFeaturedCategories();
    const cards = await Promise.all(
      categories.map(async (category) => {
        let path = `/category/${category.slug}`;
        if (category.noindex) {
          const productSlug = await findFirstSellableSlug(category.id);
          if (!productSlug) return null;
          path = `/products/${productSlug}`;
        }
        return {
          id: category.id,
          name: category.name,
          path,
          description: category.description,
        };
      }),
    );
    return cards.filter((card) => card !== null);
  },
);
