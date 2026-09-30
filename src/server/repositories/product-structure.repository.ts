import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type { Selection } from "@/lib/product-options";

import { recordSlugChange } from "./seo.repository";

type Tx = Prisma.TransactionClient;

/** ساختار گزینه‌ها و ترکیب‌های یک محصول، آماده‌ی ذخیره (محاسبه‌شده در سرویس) */
export interface OptionValuePlan {
  id?: string;
  label: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
}

export interface OptionPlan {
  id?: string;
  name: string;
  code: string;
  sortOrder: number;
  values: OptionValuePlan[];
}

export interface VariantPlan {
  id?: string;
  /** کلید محاسبه‌شده (`fill:filled|valve:persi`، `default` یا `legacy:*`) */
  key: string;
  selection: Selection;
  /** عنوان نهایی؛ `null` ⇒ خودکار (محصول قدیمی با unitValue) */
  title: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  shippingWeightGrams: number;
  /** فقط برای ترکیب جدید؛ وضعیت ترکیب موجود حفظ می‌شود (با قید مقدار/قیمت) */
  isActive: boolean;
  sortOrder: number;
}

export interface StructurePlan {
  options: OptionPlan[];
  variants: VariantPlan[];
}

const TEMP = "~tmp-";

/** کلید `کد-گروه:کد-مقدار` ⇒ شناسه‌ی مقدار */
type ValueIds = Map<string, string>;

async function syncOptions(
  tx: Tx,
  productId: string,
  plan: OptionPlan[],
): Promise<ValueIds> {
  const existing = await tx.productOption.findMany({
    where: { productId },
    include: { values: true },
  });
  const planIds = new Set(
    plan.flatMap((option) => (option.id ? [option.id] : [])),
  );
  // گروهِ حذف‌شده (فقط وقتی سفارشی نیست؛ سرویس تضمین می‌کند) ⇒ مقدارها و پیوندها cascade
  const removed = existing.filter((option) => !planIds.has(option.id));
  if (removed.length > 0) {
    await tx.productOption.deleteMany({
      where: { id: { in: removed.map((option) => option.id) } },
    });
  }
  const existingById = new Map(existing.map((option) => [option.id, option]));

  // فاز ۱: کدهایی که عوض می‌شوند موقتاً جابه‌جا می‌شوند تا جابه‌جایی کد دو گروه/مقدار نشکند
  for (const option of plan) {
    const before = option.id ? existingById.get(option.id) : undefined;
    if (!before) continue;
    if (before.code !== option.code) {
      await tx.productOption.update({
        where: { id: before.id },
        data: { code: `${TEMP}${before.id}` },
      });
    }
    for (const value of option.values) {
      const valueBefore = before.values.find((item) => item.id === value.id);
      if (valueBefore && valueBefore.code !== value.code) {
        await tx.productOptionValue.update({
          where: { id: valueBefore.id },
          data: { code: `${TEMP}${valueBefore.id}` },
        });
      }
    }
  }

  const ids: ValueIds = new Map();
  for (const option of plan) {
    const before = option.id ? existingById.get(option.id) : undefined;
    const saved = before
      ? await tx.productOption.update({
          where: { id: before.id },
          data: {
            name: option.name,
            code: option.code,
            sortOrder: option.sortOrder,
          },
        })
      : await tx.productOption.create({
          data: {
            productId,
            name: option.name,
            code: option.code,
            sortOrder: option.sortOrder,
          },
        });
    const planValueIds = new Set(
      option.values.flatMap((value) => (value.id ? [value.id] : [])),
    );
    // مقدار حذف‌شده از فرم ⇒ غیرفعال (حذف فیزیکی نه)
    for (const old of before?.values ?? []) {
      if (!planValueIds.has(old.id) && old.isActive) {
        await tx.productOptionValue.update({
          where: { id: old.id },
          data: { isActive: false },
        });
      }
    }
    for (const value of option.values) {
      const valueBefore = before?.values.find((item) => item.id === value.id);
      const savedValue = valueBefore
        ? await tx.productOptionValue.update({
            where: { id: valueBefore.id },
            data: {
              label: value.label,
              code: value.code,
              sortOrder: value.sortOrder,
              isActive: value.isActive,
            },
          })
        : await tx.productOptionValue.create({
            data: {
              optionId: saved.id,
              label: value.label,
              code: value.code,
              sortOrder: value.sortOrder,
              isActive: value.isActive,
            },
          });
      ids.set(`${option.code}:${value.code}`, savedValue.id);
    }
    // مقدارهای غیرفعالِ حذف‌شده هم برای نگاشت ترکیب‌های قدیمی لازم‌اند
    for (const old of before?.values ?? []) {
      if (!planValueIds.has(old.id))
        ids.set(`${option.code}:${old.code}`, old.id);
    }
  }
  return ids;
}

/**
 * هم‌گام‌سازی ترکیب‌ها: حذف ← کلید موقت ← به‌روزرسانی/ساخت + پیوند مقدارها.
 * کلید موقت اجازه می‌دهد دو ترکیب در یک ذخیره کلیدشان را با هم عوض کنند.
 * خروجی: آیا قیمت تازه‌ای ثبت شد (برای `priceUpdatedAt`).
 */
async function syncVariants(
  tx: Tx,
  productId: string,
  plan: VariantPlan[],
  valueIds: ValueIds,
  inactiveValueIds: Set<string>,
): Promise<boolean> {
  const existing = await tx.productVariant.findMany({ where: { productId } });
  const existingById = new Map(
    existing.map((variant) => [variant.id, variant]),
  );
  const planIds = new Set(
    plan.flatMap((variant) => (variant.id ? [variant.id] : [])),
  );
  const removeIds = existing
    .filter((variant) => !planIds.has(variant.id))
    .map((variant) => variant.id);
  if (removeIds.length > 0) {
    await tx.productVariant.deleteMany({ where: { id: { in: removeIds } } });
  }
  for (const variant of plan) {
    if (variant.id && existingById.has(variant.id)) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { optionKey: `${TEMP}${variant.id}` },
      });
    }
  }

  let priceChanged = false;
  for (const variant of plan) {
    const linked = Object.entries(variant.selection).flatMap(
      ([option, value]) => {
        const id = valueIds.get(`${option}:${value}`);
        return id ? [id] : [];
      },
    );
    const hasInactiveValue = linked.some((id) => inactiveValueIds.has(id));
    const before = variant.id ? existingById.get(variant.id) : undefined;
    const data = {
      optionKey: variant.key,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      comparePrice: variant.comparePrice,
      shippingWeightGrams: variant.shippingWeightGrams,
      sortOrder: variant.sortOrder,
    };
    let saved: { id: string };
    if (before) {
      // ترکیب بدون قیمت یا دارای مقدار غیرفعال فعال نمی‌ماند
      const keepActive =
        before.isActive && variant.price > 0 && !hasInactiveValue;
      saved = await tx.productVariant.update({
        where: { id: before.id },
        data: { ...data, isActive: keepActive },
      });
      if (before.price !== variant.price && variant.price > 0) {
        priceChanged = true;
      }
      await tx.variantOptionValue.deleteMany({
        where: { variantId: before.id },
      });
    } else {
      saved = await tx.productVariant.create({
        data: {
          ...data,
          productId,
          isActive: variant.isActive && variant.price > 0 && !hasInactiveValue,
        },
      });
      if (variant.price > 0) priceChanged = true;
    }
    if (linked.length > 0) {
      await tx.variantOptionValue.createMany({
        data: linked.map((optionValueId) => ({
          variantId: saved.id,
          optionValueId,
        })),
      });
    }
  }
  return priceChanged;
}

async function applyStructure(
  tx: Tx,
  productId: string,
  plan: StructurePlan,
): Promise<boolean> {
  const valueIds = await syncOptions(tx, productId, plan.options);
  const inactive = await tx.productOptionValue.findMany({
    where: { option: { productId }, isActive: false },
    select: { id: true },
  });
  return syncVariants(
    tx,
    productId,
    plan.variants,
    valueIds,
    new Set(inactive.map((value) => value.id)),
  );
}

/** محصول دوطرفه‌ی متناظر: جفت قبلی هر دو طرف پاک و جفت تازه ذخیره می‌شود */
async function applyPairing(
  tx: Tx,
  productId: string,
  pairedProductId: string | null,
): Promise<void> {
  await tx.product.updateMany({
    where: { pairedProductId: productId },
    data: { pairedProductId: null },
  });
  await tx.product.update({
    where: { id: productId },
    data: { pairedProductId: null },
  });
  if (!pairedProductId) return;
  await tx.product.updateMany({
    where: { pairedProductId },
    data: { pairedProductId: null },
  });
  await tx.product.update({
    where: { id: pairedProductId },
    data: { pairedProductId: productId },
  });
  await tx.product.update({
    where: { id: productId },
    data: { pairedProductId },
  });
}

export function createProductWithStructure(
  data: Prisma.ProductUncheckedCreateInput,
  plan: StructurePlan,
  pairedProductId: string | null,
) {
  return db.$transaction(async (tx) => {
    const { pairedProductId: ignored, ...fields } = data;
    void ignored;
    const product = await tx.product.create({
      data: fields,
      select: { id: true },
    });
    const priced = await applyStructure(tx, product.id, plan);
    if (priced) {
      await tx.product.update({
        where: { id: product.id },
        data: { priceUpdatedAt: new Date() },
      });
    }
    if (pairedProductId) await applyPairing(tx, product.id, pairedProductId);
    return product;
  });
}

export interface StructureUpdateOptions {
  /** `undefined` ⇒ ساختار دست‌نخورده (محصول استعلامی) */
  plan?: StructurePlan;
  /** استعلامی شدن محصول: ترکیب‌ها غیرفعال می‌شوند (نه حذف) */
  deactivateVariants?: boolean;
  /** تغییر نامک ⇒ نامک قبلی در `SlugHistory` (ریدایرکت 301 خودکار) */
  slugChange?: { from: string; to: string } | null;
  /** `undefined` ⇒ جفت دست‌نخورده */
  pairedProductId?: string | null;
}

export function updateProductWithStructure(
  productId: string,
  data: Prisma.ProductUncheckedUpdateInput,
  options: StructureUpdateOptions,
): Promise<{ deactivatedVariants: number }> {
  return db.$transaction(async (tx) => {
    let deactivatedVariants = 0;
    let priceChanged = false;
    if (options.plan)
      priceChanged = await applyStructure(tx, productId, options.plan);
    if (options.deactivateVariants) {
      const result = await tx.productVariant.updateMany({
        where: { productId, isActive: true },
        data: { isActive: false },
      });
      deactivatedVariants = result.count;
    }
    const { pairedProductId: ignored, ...fields } =
      data as Prisma.ProductUncheckedUpdateInput & {
        pairedProductId?: unknown;
      };
    void ignored;
    await tx.product.update({
      where: { id: productId },
      data: {
        ...fields,
        ...(priceChanged ? { priceUpdatedAt: new Date() } : {}),
      },
    });
    if (options.pairedProductId !== undefined) {
      await applyPairing(tx, productId, options.pairedProductId);
    }
    if (options.slugChange) {
      await recordSlugChange(tx, {
        entityType: "PRODUCT",
        entityId: productId,
        oldSlug: options.slugChange.from,
        newSlug: options.slugChange.to,
      });
    }
    return { deactivatedVariants };
  });
}
