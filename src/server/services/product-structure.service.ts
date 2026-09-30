import {
  buildVariantTitle,
  type OptionDef,
  resolveVariantKeys,
} from "@/lib/product-options";
import type { ProductInput } from "@/lib/validation/product";
import { UserFacingError } from "@/server/errors";
import {
  findProductArchiveInfo,
  type findProductById,
} from "@/server/repositories/product.repository";
import type { StructurePlan } from "@/server/repositories/product-structure.repository";

export const OPTION_CODE_LOCKED_MESSAGE =
  "پس از ثبت اولین سفارش، کد گروه‌ها و مقدارهای گزینه قابل تغییر یا حذف نیست (در آدرس‌ها و ریدایرکت‌ها استفاده می‌شوند)؛ مقدار را غیرفعال کنید.";

export type ExistingProduct = NonNullable<
  Awaited<ReturnType<typeof findProductById>>
>;

function optionDefs(input: ProductInput): OptionDef[] {
  return input.options.map((option) => ({
    code: option.code,
    name: option.name,
    values: option.values.map((value) => ({
      code: value.code,
      label: value.label,
      isActive: value.isActive,
    })),
  }));
}

/**
 * ساختار گزینه‌ها و ترکیب‌ها از ورودی فرم (SEO.md §۴.۳). کلید هر ترکیب سمت
 * سرور ساخته و اعتبارسنجی می‌شود؛ کلاینت فقط مقدارهای انتخابی را می‌فرستد.
 */
export function prepareStructure(
  input: ProductInput,
  existing: ExistingProduct | null,
): StructurePlan {
  const defs = optionDefs(input);
  const existingKeysById = new Map(
    (existing?.variants ?? []).map((variant) => [
      variant.id,
      variant.optionKey,
    ]),
  );
  const resolved = resolveVariantKeys(
    defs,
    input.variants.map((variant) => ({
      id: variant.id,
      selection: variant.selection,
    })),
    existingKeysById,
  );
  if (!resolved.ok) {
    throw new UserFacingError(
      resolved.issues[0]?.message ?? "ترکیب‌ها نامعتبر است",
    );
  }
  return {
    options: input.options.map((option, optionIndex) => ({
      id: option.id,
      name: option.name,
      code: option.code,
      sortOrder: optionIndex,
      values: option.values.map((value, valueIndex) => ({
        id: value.id,
        label: value.label,
        code: value.code,
        sortOrder: valueIndex,
        isActive: value.isActive,
      })),
    })),
    variants: input.variants.map((variant, index) => ({
      id: variant.id,
      key: resolved.keys[index]!,
      selection: variant.selection,
      title:
        variant.title ??
        (defs.length > 0 ? buildVariantTitle(defs, variant.selection) : null),
      sku: variant.sku,
      price: variant.price,
      comparePrice: variant.comparePrice,
      shippingWeightGrams: variant.shippingWeightGrams,
      isActive: variant.isActive ?? variant.price > 0,
      sortOrder: index,
    })),
  };
}

/** قفل کدها بعد از اولین سفارش: گروه و کد مقدارِ موجود نه عوض می‌شود نه حذف */
export function assertOptionCodesUnlocked(
  existing: ExistingProduct,
  input: ProductInput,
) {
  for (const option of existing.options) {
    const incoming = input.options.find((item) => item.id === option.id);
    if (!incoming || incoming.code !== option.code) {
      throw new UserFacingError(OPTION_CODE_LOCKED_MESSAGE);
    }
    for (const value of option.values) {
      const incomingValue = incoming.values.find(
        (item) => item.id === value.id,
      );
      // حذف مقدار از فرم = غیرفعال شدن (مجاز)؛ تغییر کد مجاز نیست
      if (incomingValue && incomingValue.code !== value.code) {
        throw new UserFacingError(OPTION_CODE_LOCKED_MESSAGE);
      }
    }
  }
}

export async function assertPairable(
  id: string | null,
  pairedId: string | null,
) {
  if (!pairedId) return;
  if (pairedId === id) {
    throw new UserFacingError("محصول نمی‌تواند متناظر خودش باشد");
  }
  if (!(await findProductArchiveInfo(pairedId))) {
    throw new UserFacingError("محصول متناظر یافت نشد");
  }
}
