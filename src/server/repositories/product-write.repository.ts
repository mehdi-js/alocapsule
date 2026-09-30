import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { recordSlugChange } from "./seo.repository";

export interface VariantFields {
  unitValue: number;
  title: string | null;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  shippingWeightGrams: number;
  sortOrder: number;
}

export interface VariantCreate extends VariantFields {
  isActive: boolean;
}

export interface VariantUpdate extends VariantFields {
  id: string;
  /** اگر `unitValue` تغییر می‌کند، برای جلوگیری از تداخل یکتایی موقتاً جابه‌جا می‌شود */
  unitValueChanged: boolean;
}

export interface VariantSyncPlan {
  creates: VariantCreate[];
  updates: VariantUpdate[];
  deleteIds: string[];
}

export function createProductWithVariants(
  data: Omit<Prisma.ProductUncheckedCreateInput, "variants">,
  variants: VariantCreate[],
) {
  return db.product.create({
    data: { ...data, variants: { create: variants } },
    select: { id: true },
  });
}

/**
 * ویرایش محصول و هم‌گام‌سازی variantها در یک تراکنش:
 * حذف ← جابه‌جایی موقت unitValue ← به‌روزرسانی ← ساخت.
 * جابه‌جایی موقت (مقدار منفی) اجازه می‌دهد دو variant در یک ذخیره مقدارشان را
 * با هم عوض کنند بدون نقض `unique(productId, unitValue)`.
 */
export function updateProductWithVariants(
  productId: string,
  data: Prisma.ProductUncheckedUpdateInput,
  plan: VariantSyncPlan,
  /** تغییر نامک ⇒ نامک قبلی در `SlugHistory` (ریدایرکت 301 خودکار) */
  slugChange: { from: string; to: string } | null,
  /** استعلامی شدن محصول: متغیرها غیرفعال می‌شوند (نه حذف) و تعدادشان برمی‌گردد */
  options: { deactivateVariants?: boolean } = {},
): Promise<{ deactivatedVariants: number }> {
  return db.$transaction(async (tx) => {
    let deactivatedVariants = 0;
    if (plan.deleteIds.length > 0) {
      await tx.productVariant.deleteMany({
        where: { id: { in: plan.deleteIds }, productId },
      });
    }

    const shifted = plan.updates.filter((update) => update.unitValueChanged);
    for (const [index, update] of shifted.entries()) {
      await tx.productVariant.update({
        where: { id: update.id },
        data: { unitValue: -(index + 1) },
      });
    }

    for (const { id, unitValueChanged, ...fields } of plan.updates) {
      void unitValueChanged;
      await tx.productVariant.update({ where: { id }, data: fields });
    }

    for (const variant of plan.creates) {
      await tx.productVariant.create({ data: { ...variant, productId } });
    }

    if (options.deactivateVariants) {
      const result = await tx.productVariant.updateMany({
        where: { productId, isActive: true },
        data: { isActive: false },
      });
      deactivatedVariants = result.count;
    }

    await tx.product.update({ where: { id: productId }, data });
    if (slugChange) {
      await recordSlugChange(tx, {
        entityType: "PRODUCT",
        entityId: productId,
        oldSlug: slugChange.from,
        newSlug: slugChange.to,
      });
    }
    return { deactivatedVariants };
  });
}
