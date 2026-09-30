/**
 * مدل گزینه‌های محصول (SEO.md §۴.۳): هر ترکیب از مقدارهای گروه‌های گزینه یک
 * `ProductVariant` با قیمت مستقل است. همه‌ی توابع این فایل خالص‌اند.
 *
 * - `optionKey`: کلید مرتب‌شده‌ی ترکیب بر اساس کد گروه، مثل `fill:filled|valve:persi`؛
 *   محصول بدون گروه ⇒ `default`.
 * - عنوان خودکار ترکیب: برچسب مقدارها به ترتیب گروه‌ها، مثل «پرسی · پرشده».
 */

export const DEFAULT_OPTION_KEY = "default";
/** پیشوند کلید variantهای مدل قدیمی (چند اندازه بدون گروه گزینه) */
export const LEGACY_KEY_PREFIX = "legacy:";

/** کد گروه/مقدار: لاتین کوچک، عدد و خط تیره (بدون `:` و `|` که در کلید جدا‌کننده‌اند) */
export const OPTION_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_OPTION_GROUPS = 3;
export const MAX_OPTION_VALUES = 12;

export interface OptionValueDef {
  code: string;
  label: string;
  /** مقدار غیرفعال در ساخت ترکیب‌های جدید نمی‌آید */
  isActive?: boolean;
}

export interface OptionDef {
  code: string;
  name: string;
  /** به ترتیب نمایش */
  values: OptionValueDef[];
}

/** انتخاب یک ترکیب: کد گروه ⇒ کد مقدار */
export type Selection = Record<string, string>;

export function buildOptionKey(selection: Selection): string {
  const entries = Object.entries(selection).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  if (entries.length === 0) return DEFAULT_OPTION_KEY;
  return entries.map(([option, value]) => `${option}:${value}`).join("|");
}

export function isLegacyKey(key: string): boolean {
  return key.startsWith(LEGACY_KEY_PREFIX);
}

/** کلید → انتخاب (برای خواندن مقدارها از کلید ذخیره‌شده) */
export function parseOptionKey(key: string): Selection {
  if (key === DEFAULT_OPTION_KEY || isLegacyKey(key)) return {};
  return Object.fromEntries(
    key.split("|").map((part) => {
      const index = part.indexOf(":");
      return [part.slice(0, index), part.slice(index + 1)];
    }),
  );
}

/** «پرسی · پرشده»: برچسب مقدارها به ترتیب گروه‌ها */
export function buildVariantTitle(
  options: OptionDef[],
  selection: Selection,
): string {
  return options
    .flatMap((option) => {
      const value = option.values.find(
        (item) => item.code === selection[option.code],
      );
      return value ? [value.label] : [];
    })
    .join(" · ");
}

/** همه‌ی ترکیب‌های مقدارهای **فعال** (ضرب دکارتی به ترتیب گروه‌ها و مقدارها) */
export function generateCombinations(options: OptionDef[]): Selection[] {
  if (options.length === 0) return [];
  let combos: Selection[] = [{}];
  for (const option of options) {
    const values = option.values.filter((value) => value.isActive !== false);
    combos = combos.flatMap((combo) =>
      values.map((value) => ({ ...combo, [option.code]: value.code })),
    );
  }
  return combos;
}

/**
 * «ساخت همه‌ی ترکیب‌ها»: فقط ترکیب‌هایی که کلیدشان هنوز نیست؛ ترکیب موجود
 * هرگز دوباره ساخته یا دست‌کاری نمی‌شود.
 */
export function missingCombinations(
  options: OptionDef[],
  existingKeys: readonly string[],
): Selection[] {
  const existing = new Set(existingKeys);
  const seen = new Set<string>();
  return generateCombinations(options).filter((combo) => {
    const key = buildOptionKey(combo);
    if (existing.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface OptionIssue {
  path: string;
  message: string;
}

/** کدها یکتا و معتبر؛ حداکثر ۳ گروه و ۱۲ مقدار */
export function validateOptionDefinitions(
  options: readonly OptionDef[],
): OptionIssue[] {
  const issues: OptionIssue[] = [];
  if (options.length > MAX_OPTION_GROUPS) {
    issues.push({
      path: "options",
      message: `حداکثر ${MAX_OPTION_GROUPS} گروه گزینه مجاز است`,
    });
  }
  const groupCodes = new Set<string>();
  options.forEach((option, optionIndex) => {
    const base = `options.${optionIndex}`;
    if (!OPTION_CODE_PATTERN.test(option.code)) {
      issues.push({
        path: `${base}.code`,
        message: "کد گروه فقط حروف کوچک انگلیسی، عدد و خط تیره باشد",
      });
    } else if (groupCodes.has(option.code)) {
      issues.push({ path: `${base}.code`, message: "کد گروه تکراری است" });
    }
    groupCodes.add(option.code);
    if (option.values.length === 0) {
      issues.push({
        path: `${base}.values`,
        message: "هر گروه حداقل یک مقدار لازم دارد",
      });
    }
    if (option.values.length > MAX_OPTION_VALUES) {
      issues.push({
        path: `${base}.values`,
        message: `حداکثر ${MAX_OPTION_VALUES} مقدار در هر گروه مجاز است`,
      });
    }
    const valueCodes = new Set<string>();
    const labels = new Set<string>();
    option.values.forEach((value, valueIndex) => {
      const valuePath = `${base}.values.${valueIndex}`;
      if (!OPTION_CODE_PATTERN.test(value.code)) {
        issues.push({
          path: `${valuePath}.code`,
          message: "کد مقدار فقط حروف کوچک انگلیسی، عدد و خط تیره باشد",
        });
      } else if (valueCodes.has(value.code)) {
        issues.push({
          path: `${valuePath}.code`,
          message: "کد مقدار تکراری است",
        });
      }
      valueCodes.add(value.code);
      const label = value.label.trim();
      if (labels.has(label)) {
        issues.push({
          path: `${valuePath}.label`,
          message: "برچسب مقدار تکراری است",
        });
      }
      labels.add(label);
    });
  });
  return issues;
}

export interface KeyedVariantInput {
  /** شناسه‌ی variant ذخیره‌شده (خالی ⇒ ترکیب جدید) */
  id?: string;
  /** کد گروه ⇒ کد مقدار */
  selection: Selection;
}

export type ResolvedKeys =
  { ok: true; keys: string[] } | { ok: false; issues: OptionIssue[] };

/**
 * کلید هر variant ورودی + اعتبارسنجی ترکیب‌ها:
 * - محصول دارای گروه: هر variant دقیقاً یک مقدار **موجود** از هر گروه؛ کلید یکتا.
 * - محصول بدون گروه: دقیقاً یک variant با کلید `default`؛ فقط variantهای قدیمیِ
 *   چندگانه (`legacy:*`) با همان شناسه و کلید فعلی‌شان باقی می‌مانند.
 */
export function resolveVariantKeys(
  options: readonly OptionDef[],
  variants: readonly KeyedVariantInput[],
  existingKeysById: ReadonlyMap<string, string>,
): ResolvedKeys {
  const issues: OptionIssue[] = [];
  const keys: string[] = [];

  if (options.length === 0) {
    const legacy = variants.map((variant) => {
      const key = variant.id ? existingKeysById.get(variant.id) : undefined;
      return key && isLegacyKey(key) ? key : null;
    });
    if (variants.length > 1 && legacy.every((key) => key !== null)) {
      return { ok: true, keys: legacy as string[] };
    }
    if (variants.length !== 1) {
      return {
        ok: false,
        issues: [
          {
            path: "variants",
            message: "محصول بدون گزینه دقیقاً یک قیمت (ترکیب) دارد",
          },
        ],
      };
    }
    return { ok: true, keys: [DEFAULT_OPTION_KEY] };
  }

  const seen = new Set<string>();
  variants.forEach((variant, index) => {
    const path = `variants.${index}`;
    let valid = true;
    for (const option of options) {
      const valueCode = variant.selection[option.code];
      if (!valueCode || !option.values.some((v) => v.code === valueCode)) {
        issues.push({
          path: `${path}.selection`,
          message: `برای گروه «${option.name}» یک مقدار معتبر انتخاب کنید`,
        });
        valid = false;
      }
    }
    const extra = Object.keys(variant.selection).filter(
      (code) => !options.some((option) => option.code === code),
    );
    if (extra.length > 0) {
      issues.push({
        path: `${path}.selection`,
        message: "گروه گزینه‌ی ناشناخته",
      });
      valid = false;
    }
    if (!valid) {
      keys.push("");
      return;
    }
    const key = buildOptionKey(variant.selection);
    if (seen.has(key)) {
      issues.push({
        path: `${path}.selection`,
        message: "این ترکیب تکراری است",
      });
    }
    seen.add(key);
    keys.push(key);
  });
  return issues.length > 0 ? { ok: false, issues } : { ok: true, keys };
}

export type FilledPriceSuggestion =
  { kind: "ok"; chargePrice: number } | { kind: "warn"; message: string };

export const DIFFERENT_CHARGE_PRICES_MESSAGE =
  "قیمت شارژ پرسی و بوتان متفاوت است؛ قیمت پرشده را دستی وارد کنید.";
export const NO_CHARGE_PRICE_MESSAGE =
  "محصول متناظر (شارژ) قیمت فعال ندارد؛ قیمت پرشده را دستی وارد کنید.";

/**
 * «محاسبه‌ی قیمت پرشده» = قیمت خالی + قیمت شارژ محصول متناظر. اگر قیمت‌های
 * فعال شارژ یکسان نیستند (یا قیمتی نیست) **پر نمی‌کند** و هشدار می‌دهد.
 */
export function suggestChargePrice(
  chargePrices: readonly number[],
): FilledPriceSuggestion {
  const prices = [...new Set(chargePrices.filter((price) => price > 0))];
  if (prices.length === 0) {
    return { kind: "warn", message: NO_CHARGE_PRICE_MESSAGE };
  }
  if (prices.length > 1) {
    return { kind: "warn", message: DIFFERENT_CHARGE_PRICES_MESSAGE };
  }
  return { kind: "ok", chargePrice: prices[0]! };
}

export interface PriceRow {
  selection: Selection;
  /** `null` ⇒ خالی/نامعتبر */
  price: number | null;
}

export type FilledPricesResult =
  | { kind: "ok"; prices: { selection: Selection; price: number }[] }
  | { kind: "warn"; message: string };

/**
 * برای هر ردیف `fill=filled` قیمتِ ردیف متناظرِ `fill=empty` (همان بقیه‌ی
 * گزینه‌ها) + قیمت شارژ را پیشنهاد می‌دهد. ردیف خالیِ بدون قیمت رد می‌شود.
 */
export function computeFilledPrices(
  rows: readonly PriceRow[],
  chargePrices: readonly number[],
  codes: { option: string; empty: string; filled: string } = {
    option: "fill",
    empty: "empty",
    filled: "filled",
  },
): FilledPricesResult {
  const charge = suggestChargePrice(chargePrices);
  if (charge.kind === "warn") return charge;
  const others = (selection: Selection) =>
    buildOptionKey(
      Object.fromEntries(
        Object.entries(selection).filter(([code]) => code !== codes.option),
      ),
    );
  const emptyByOthers = new Map(
    rows
      .filter((row) => row.selection[codes.option] === codes.empty)
      .map((row) => [others(row.selection), row.price] as const),
  );
  const prices = rows.flatMap((row) => {
    if (row.selection[codes.option] !== codes.filled) return [];
    const empty = emptyByOthers.get(others(row.selection));
    return empty && empty > 0
      ? [{ selection: row.selection, price: empty + charge.chargePrice }]
      : [];
  });
  if (prices.length === 0) {
    return {
      kind: "warn",
      message: "ابتدا قیمت ترکیب «خالی» را وارد کنید.",
    };
  }
  return { kind: "ok", prices };
}
