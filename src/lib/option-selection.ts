import {
  buildOptionKey,
  parseOptionKey,
  type Selection,
} from "./product-options";

/**
 * منطق خالص صفحه‌ی محصول دارای گزینه‌ها (SEO.md §۴.۵ و §۴.۶): خواندن پارامتر
 * URL، انتخاب ترکیب، وضعیت دکمه‌ها، سوییچ اندازه و جدول قیمت. هم سرور (رندر
 * اولیه) و هم کلاینت (دکمه‌ها) از همین توابع استفاده می‌کنند تا نتیجه یکی باشد.
 */

export interface PageOption {
  code: string;
  name: string;
  /** فقط مقدارهای فعال، به ترتیب نمایش */
  values: { code: string; label: string }[];
}

export interface SelectableVariant {
  selection: Selection;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * پارامترهای URL → انتخاب درخواستی. گروه یا مقدار ناشناخته نادیده گرفته
 * می‌شود (`?valve=xyz` ⇒ خالی) و هرگز خطا نمی‌دهد.
 */
export function parseSelectionParams(
  params: SearchParams,
  options: readonly PageOption[],
): Selection {
  const selection: Selection = {};
  for (const option of options) {
    const raw = first(params[option.code]);
    if (raw && option.values.some((value) => value.code === raw)) {
      selection[option.code] = raw;
    }
  }
  return selection;
}

function matches(variant: SelectableVariant, selection: Selection): boolean {
  return Object.entries(selection).every(
    ([code, value]) => variant.selection[code] === value,
  );
}

/**
 * ترکیب انتخاب‌شده از روی درخواست: همه‌ی مقدارهای درخواستی اگر ترکیب فعالی
 * دارند؛ وگرنه مقدارها به ترتیب گروه‌ها تا جایی که ترکیبی باقی بماند اعمال
 * می‌شوند؛ بدون درخواست معتبر ⇒ اولین ترکیب فعال (به ترتیب ادمین).
 * ورودی: فقط ترکیب‌های **فعال** به ترتیب نمایش.
 */
export function resolveSelected<T extends SelectableVariant>(
  variants: readonly T[],
  requested: Selection,
  options: readonly PageOption[],
): T | null {
  if (variants.length === 0) return null;
  let pool = [...variants];
  for (const option of options) {
    const value = requested[option.code];
    if (value === undefined) continue;
    const next = pool.filter(
      (variant) => variant.selection[option.code] === value,
    );
    if (next.length > 0) pool = next;
  }
  return pool[0] ?? variants[0] ?? null;
}

export interface ChipState {
  code: string;
  label: string;
  selected: boolean;
  /** `false` ⇒ هیچ ترکیب فعالی با این مقدار نیست (کم‌رنگ و غیرقابل انتخاب) */
  available: boolean;
}

export function chipStates(
  options: readonly PageOption[],
  variants: readonly SelectableVariant[],
  selected: Selection,
): { option: PageOption; chips: ChipState[] }[] {
  return options.map((option) => ({
    option,
    chips: option.values.map((value) => ({
      code: value.code,
      label: value.label,
      selected: selected[option.code] === value.code,
      available: variants.some(
        (variant) => variant.selection[option.code] === value.code,
      ),
    })),
  }));
}

/**
 * با کلیک روی یک دکمه کدام ترکیب انتخاب شود: ترکیب‌های دارای آن مقدار، و
 * بینشان آن‌که بیشترین شباهت را به انتخاب فعلی دارد (اگر ترکیب دقیق فعال نبود
 * به نزدیک‌ترین می‌رود، نه بن‌بست).
 */
export function selectForChip<T extends SelectableVariant>(
  variants: readonly T[],
  current: Selection,
  optionCode: string,
  valueCode: string,
): T | null {
  const candidates = variants.filter(
    (variant) => variant.selection[optionCode] === valueCode,
  );
  if (candidates.length === 0) return null;
  const score = (variant: T) =>
    Object.entries(current).filter(
      ([code, value]) =>
        code !== optionCode && variant.selection[code] === value,
    ).length;
  return candidates.reduce((best, variant) =>
    score(variant) > score(best) ? variant : best,
  );
}

/** `?valve=persi&fill=filled` به ترتیب گروه‌ها؛ بدون گزینه ⇒ رشته‌ی خالی */
export function selectionQuery(
  options: readonly PageOption[],
  selection: Selection,
): string {
  const params = new URLSearchParams();
  for (const option of options) {
    const value = selection[option.code];
    if (value !== undefined) params.set(option.code, value);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

// ───────── سوییچ اندازه ─────────

export interface SizeSwitchItem {
  slug: string;
  name: string;
  /** «۱۱» */
  label: string;
  current: boolean;
  /** `/products/slug?valve=persi` با گزینه‌های مشترکِ انتخاب فعلی */
  href: string;
}

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * نام‌های هم‌خانواده («شارژ کپسول گاز ۱۱ کیلویی» …) ⇒ برچسب کوتاه هر کدام
 * («۱۱»، «۲۵» …) و پسوند مشترک («کیلویی») با حذف پیشوند/پسوند مشترکِ کلمه‌ها.
 * اگر نتیجه برای موردی خالی یا یکسان شود، نام کامل بدون پسوند برمی‌گردد.
 */
export function sizeLabels(names: readonly string[]): {
  labels: string[];
  suffix: string;
} {
  const split = names.map(words);
  const full = { labels: [...names], suffix: "" };
  if (split.length < 2) return full;

  let prefix = 0;
  while (
    split.every((w) => w.length > prefix + 1) &&
    split.every((w) => w[prefix] === split[0]![prefix])
  ) {
    prefix++;
  }
  let suffix = 0;
  while (
    split.every((w) => w.length > prefix + suffix + 1) &&
    split.every(
      (w) =>
        w[w.length - 1 - suffix] === split[0]![split[0]!.length - 1 - suffix],
    )
  ) {
    suffix++;
  }
  const labels = split.map((w) => w.slice(prefix, w.length - suffix).join(" "));
  if (
    labels.some((label) => !label) ||
    new Set(labels).size !== labels.length
  ) {
    return full;
  }
  return {
    labels,
    suffix: split[0]!.slice(split[0]!.length - suffix).join(" "),
  };
}

export interface SiblingProduct {
  slug: string;
  name: string;
  options: readonly PageOption[];
}

/**
 * سوییچ اندازه: محصولات فعال هم‌دسته به ترتیب؛ پارامترهای گزینه‌ی فعلی فقط
 * اگر هم‌خانواده همان گروه و مقدار را دارد منتقل می‌شوند. کمتر از دو محصول ⇒ خالی.
 */
export function buildSizeSwitch(
  siblings: readonly SiblingProduct[],
  currentSlug: string,
  currentSelection: Selection,
): { items: SizeSwitchItem[]; suffix: string } {
  if (siblings.length < 2) return { items: [], suffix: "" };
  const { labels, suffix } = sizeLabels(siblings.map((item) => item.name));
  return {
    suffix,
    items: siblings.map((item, index) => {
      const carried: Selection = {};
      for (const option of item.options) {
        const value = currentSelection[option.code];
        if (value && option.values.some((v) => v.code === value)) {
          carried[option.code] = value;
        }
      }
      return {
        slug: item.slug,
        name: item.name,
        label: labels[index]!,
        current: item.slug === currentSlug,
        href: `/products/${item.slug}${selectionQuery(item.options, carried)}`,
      };
    }),
  };
}

// ───────── جدول قیمت ─────────

export interface TableProduct {
  slug: string;
  name: string;
  options: readonly PageOption[];
  /** فقط ترکیب‌های فعال */
  variants: readonly { selection: Selection; price: number }[];
}

export interface PriceTableCell {
  price: number;
  href: string;
}

export interface PriceTableRow {
  key: string;
  productName: string;
  /** برچسب گروه‌های میانی («۱۱ کیلویی»)؛ بدون گروه میانی ⇒ `null` */
  midLabel: string | null;
  href: string;
  /** هم‌ترتیب ستون‌ها؛ ترکیب غیرفعال/نبود ⇒ `null` */
  cells: (PriceTableCell | null)[];
}

export interface PriceTable {
  /** نام گروه ستون‌ها («نوع شیر») یا `null` (ستون واحد «قیمت») */
  columnGroup: string | null;
  columns: { code: string; label: string }[];
  rows: PriceTableRow[];
}

/**
 * جدول قیمت (SEO.md §۴.۶): ردیف = محصول (+ ترکیب‌های گروه‌های میانی)، ستون =
 * آخرین گروه گزینه. اگر همه‌ی محصولات بدون گزینه‌اند یک ستون «قیمت» دارد؛
 * محصول بدون گزینه در کنار محصولِ گزینه‌دار وارد جدول نمی‌شود.
 */
export function buildPriceTable(products: readonly TableProduct[]): PriceTable {
  const withOptions = products.filter((product) => product.options.length > 0);
  const useOptions = withOptions.length > 0;
  const tableProducts = useOptions
    ? withOptions
    : products.filter((product) => product.variants.length > 0);

  const columns: PriceTable["columns"] = [];
  let columnGroup: string | null = null;
  if (useOptions) {
    for (const product of tableProducts) {
      const last = product.options.at(-1)!;
      columnGroup ??= last.name;
      for (const value of last.values) {
        if (!columns.some((column) => column.code === value.code)) {
          columns.push({ code: value.code, label: value.label });
        }
      }
    }
  } else {
    columns.push({ code: "price", label: "قیمت" });
  }

  const rows: PriceTableRow[] = [];
  for (const product of tableProducts) {
    const href = `/products/${product.slug}`;
    if (!useOptions) {
      const variant = product.variants[0];
      rows.push({
        key: product.slug,
        productName: product.name,
        midLabel: null,
        href,
        cells: variant ? [{ price: variant.price, href }] : [null],
      });
      continue;
    }
    const last = product.options.at(-1)!;
    const middle = product.options.slice(0, -1);
    const groups = new Map<string, Selection>();
    for (const variant of product.variants) {
      const mid: Selection = {};
      for (const option of middle) {
        const value = variant.selection[option.code];
        if (value !== undefined) mid[option.code] = value;
      }
      const key = buildOptionKey(mid);
      if (!groups.has(key)) groups.set(key, mid);
    }
    for (const [key, mid] of groups) {
      const midLabel =
        middle.length === 0
          ? null
          : middle
              .map(
                (option) =>
                  option.values.find((value) => value.code === mid[option.code])
                    ?.label,
              )
              .filter(Boolean)
              .join(" · ");
      rows.push({
        key: `${product.slug}|${key}`,
        productName: product.name,
        midLabel,
        href: `${href}${selectionQuery(product.options, mid)}`,
        cells: columns.map((column) => {
          const variant = product.variants.find(
            (item) =>
              item.selection[last.code] === column.code &&
              buildOptionKey(
                Object.fromEntries(
                  Object.entries(item.selection).filter(
                    ([code]) => code !== last.code,
                  ),
                ),
              ) === key,
          );
          if (!variant) return null;
          return {
            price: variant.price,
            href: `${href}${selectionQuery(product.options, variant.selection)}`,
          };
        }),
      });
    }
  }
  return { columnGroup, columns, rows };
}

/** انتخاب ترکیب از کلید ذخیره‌شده (برای ساخت `selection` هر ترکیب صفحه) */
export function selectionOf(optionKey: string): Selection {
  return parseOptionKey(optionKey);
}
