/**
 * ساخت آدرس فهرست محصولات از روی فیلترها (بدون وابستگی به سرور تا در
 * کامپوننت‌های کلاینت هم قابل استفاده باشد).
 */

export type CatalogSortKey = "featured" | "newest" | "cheapest" | "expensive";

/**
 * کلید بسته = واحد + مقدار، مثل `g500` (۵۰۰ گرم) یا `p12` (۱۲ عددی).
 * فقط مقدار کافی نیست: «۱۲ عددی» و «۱۲ گرم» دو بسته‌ی متفاوت‌اند.
 */
export type PackUnit = "GRAM" | "PIECE";
export interface Pack {
  unit: PackUnit;
  value: number;
}

const PACK_PATTERN = /^([gp])(\d{1,7})$/;

export function packKey(pack: Pack): string {
  return `${pack.unit === "GRAM" ? "g" : "p"}${pack.value}`;
}

export function parsePackKey(key: string): Pack | null {
  const match = PACK_PATTERN.exec(key);
  if (!match) return null;
  const value = Number(match[2]);
  if (value <= 0) return null;
  return { unit: match[1] === "g" ? "GRAM" : "PIECE", value };
}

/** مرتب: اول وزنی‌ها، بعد تعدادی‌ها، هر کدام صعودی */
export function comparePacks(a: Pack, b: Pack): number {
  if (a.unit !== b.unit) return a.unit === "GRAM" ? -1 : 1;
  return a.value - b.value;
}

export interface CatalogUrlState {
  categorySlugs: string[];
  /** کلیدهای بسته (`g500`, `p12`) */
  packKeys: string[];
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
  sort: CatalogSortKey;
  page: number;
}

export function buildCatalogHref(
  state: CatalogUrlState,
  basePath = "/products",
): string {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.categorySlugs.length > 0) {
    params.set("category", state.categorySlugs.join(","));
  }
  if (state.packKeys.length > 0) {
    params.set("weight", [...state.packKeys].sort().join(","));
  }
  if (state.minPrice !== null) params.set("min", String(state.minPrice));
  if (state.maxPrice !== null) params.set("max", String(state.maxPrice));
  if (state.sort !== "featured") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** افزودن یا برداشتن یک مقدار از فهرست (برای چک‌باکس‌ها و قرص‌ها) */
export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function hasActiveFilters(state: CatalogUrlState): boolean {
  return (
    state.categorySlugs.length > 0 ||
    state.packKeys.length > 0 ||
    state.minPrice !== null ||
    state.maxPrice !== null ||
    state.search !== ""
  );
}

/** وضعیت فهرست برای canonical/robots (SEO.md §۴.۲) */
export function listingSeoState(
  state: CatalogUrlState & { sort: string; page: number },
): { page: number; filtered: boolean; search: boolean } {
  return {
    page: state.page,
    filtered: hasActiveFilters(state) || state.sort !== "featured",
    search: state.search !== "",
  };
}
