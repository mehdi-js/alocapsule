import { buildOptionKey, type Selection } from "@/lib/product-options";

import {
  emptyOption,
  emptyOptionValue,
  emptyVariantRow,
  type OptionState,
  type OptionValueState,
  type VariantRowState,
} from "./product-form-state";

/**
 * تغییرهای گروه‌ها و مقدارها به‌همراه هم‌گام‌سازی ترکیب‌ها. همه‌ی توابع خالص‌اند:
 * `{ options, variants }` تازه برمی‌گردانند.
 */
export interface OptionsAndRows {
  options: OptionState[];
  variants: VariantRowState[];
}

/** ردیف‌هایی که بعد از حذف/تغییر گروه‌ها کلیدشان یکی شده؛ اولین باقی می‌ماند */
function dedupeRows(rows: VariantRowState[]): VariantRowState[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = buildOptionKey(row.selection);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapSelection(
  rows: VariantRowState[],
  map: (selection: Selection) => Selection,
): VariantRowState[] {
  return rows.map((row) => ({ ...row, selection: map(row.selection) }));
}

export function addOptionGroup(state: OptionsAndRows): OptionsAndRows {
  // ترکیب‌های فعلی بدون مقدار برای گروه تازه نامعتبرند؛ تا «ساخت همه‌ی ترکیب‌ها»
  // فقط ردیف‌های ذخیره‌شده می‌مانند (سرور ناقص بودنشان را گزارش می‌دهد)
  const first = state.options.length === 0;
  return {
    options: [...state.options, emptyOption()],
    // از «بدون گزینه» به «گزینه‌دار»: ردیف پیش‌فرضِ بی‌شناسه کنار گذاشته می‌شود
    variants: first
      ? state.variants.filter((row) => row.id !== undefined)
      : state.variants,
  };
}

export function removeOptionGroup(
  state: OptionsAndRows,
  optionKey: string,
): OptionsAndRows {
  const removed = state.options.find((option) => option.key === optionKey);
  if (!removed) return state;
  const options = state.options.filter((option) => option.key !== optionKey);
  const variants = dedupeRows(
    mapSelection(state.variants, (selection) => {
      const { [removed.code]: dropped, ...rest } = selection;
      void dropped;
      return rest;
    }),
  );
  return {
    options,
    // بدون گروه هیچ‌چیز نمانده ⇒ یک ردیف پیش‌فرض
    variants:
      options.length === 0 && variants.length === 0
        ? [emptyVariantRow()]
        : variants,
  };
}

export function updateOptionGroup(
  state: OptionsAndRows,
  optionKey: string,
  patch: Partial<Pick<OptionState, "name" | "code">>,
): OptionsAndRows {
  const before = state.options.find((option) => option.key === optionKey);
  if (!before) return state;
  const options = state.options.map((option) =>
    option.key === optionKey ? { ...option, ...patch } : option,
  );
  if (patch.code === undefined || patch.code === before.code) {
    return { options, variants: state.variants };
  }
  // تغییر کد گروه ⇒ کلید انتخاب همه‌ی ردیف‌ها هم عوض می‌شود
  const variants = mapSelection(state.variants, (selection) => {
    if (!(before.code in selection)) return selection;
    const { [before.code]: value, ...rest } = selection;
    return patch.code ? { ...rest, [patch.code]: value! } : rest;
  });
  return { options, variants };
}

export function addOptionValue(
  state: OptionsAndRows,
  optionKey: string,
): OptionsAndRows {
  return {
    options: state.options.map((option) =>
      option.key === optionKey
        ? { ...option, values: [...option.values, emptyOptionValue()] }
        : option,
    ),
    variants: state.variants,
  };
}

export function updateOptionValue(
  state: OptionsAndRows,
  optionKey: string,
  valueKey: string,
  patch: Partial<Pick<OptionValueState, "label" | "code" | "isActive">>,
): OptionsAndRows {
  const option = state.options.find((item) => item.key === optionKey);
  const before = option?.values.find((value) => value.key === valueKey);
  if (!option || !before) return state;
  const options = state.options.map((item) =>
    item.key === optionKey
      ? {
          ...item,
          values: item.values.map((value) =>
            value.key === valueKey ? { ...value, ...patch } : value,
          ),
        }
      : item,
  );
  if (patch.code === undefined || patch.code === before.code) {
    return { options, variants: state.variants };
  }
  // تغییر کد مقدار ⇒ ردیف‌های شامل آن مقدار هم به‌روز می‌شوند
  const variants = mapSelection(state.variants, (selection) =>
    selection[option.code] === before.code
      ? { ...selection, [option.code]: patch.code! }
      : selection,
  );
  return { options, variants };
}

/**
 * حذف مقدار: مقدار ذخیره‌شده فقط غیرفعال می‌شود (حذف فیزیکی نه)؛ مقدار
 * ذخیره‌نشده با ردیف‌های بی‌شناسه‌ی شامل آن حذف می‌شود.
 */
export function removeOptionValue(
  state: OptionsAndRows,
  optionKey: string,
  valueKey: string,
): OptionsAndRows {
  const option = state.options.find((item) => item.key === optionKey);
  const value = option?.values.find((item) => item.key === valueKey);
  if (!option || !value) return state;
  if (value.id) {
    return updateOptionValue(state, optionKey, valueKey, { isActive: false });
  }
  return {
    options: state.options.map((item) =>
      item.key === optionKey
        ? { ...item, values: item.values.filter((v) => v.key !== valueKey) }
        : item,
    ),
    variants: state.variants.filter(
      (row) => row.id || row.selection[option.code] !== value.code,
    ),
  };
}
