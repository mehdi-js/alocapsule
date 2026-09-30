import type { VariantInput } from "@/lib/validation/product";
import { UserFacingError } from "@/server/errors";
import type { VariantSyncPlan } from "@/server/repositories/product-write.repository";

/**
 * تفاوت variantهای فعلی و ورودی فرم:
 * - بدون `id` ⇒ ساخت، با `id` ⇒ ویرایش، و variantی که در ورودی نیست ⇒ حذف.
 * - ترتیب نمایش = ترتیب در فرم.
 * - `isActive` متغیر موجود هرگز از فرم تغییر نمی‌کند (کلید فوری).
 */
export function planVariantSync(
  existing: Array<{ id: string; unitValue: number }>,
  incoming: VariantInput[],
): VariantSyncPlan {
  const existingById = new Map(existing.map((v) => [v.id, v.unitValue]));
  const seenIds = new Set<string>();
  const plan: VariantSyncPlan = { creates: [], updates: [], deleteIds: [] };

  incoming.forEach((variant, sortOrder) => {
    const { id, isActive, ...rest } = variant;
    const fields = { ...rest, sortOrder };

    if (!id) {
      plan.creates.push({ ...fields, isActive: isActive ?? true });
      return;
    }
    const previousUnitValue = existingById.get(id);
    if (previousUnitValue === undefined || seenIds.has(id)) {
      throw new UserFacingError(
        "متغیر نامعتبر است. صفحه را دوباره بارگذاری کنید.",
      );
    }
    seenIds.add(id);
    plan.updates.push({
      ...fields,
      id,
      unitValueChanged: previousUnitValue !== variant.unitValue,
    });
  });

  plan.deleteIds = existing.filter((v) => !seenIds.has(v.id)).map((v) => v.id);
  return plan;
}
