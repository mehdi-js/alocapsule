"use client";

import { Switch } from "@/components/ui/Switch";
import { setProductActiveAction } from "@/server/actions/product";
import type { ProductEditDto } from "@/server/services/product-query.service";

import { ActiveSwitch } from "./ActiveSwitch";

const cardClass =
  "flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-neutral-900 bg-white p-5";

/**
 * کلید برجسته‌ی «فعال در سایت» — تنها راه برداشتن موقت محصول از فروشگاه.
 * محصول موجود: اعمال فوری (بدون ذخیره). محصول جدید: همراه ذخیره‌ی فرم.
 */
export function ProductActiveCard({
  product,
  isActive,
  onChange,
}: {
  product?: ProductEditDto;
  isActive: boolean;
  onChange: (isActive: boolean) => void;
}) {
  if (product) {
    return (
      <div className={cardClass}>
        <div>
          <p className="text-lg font-bold">فعال در سایت</p>
          <p className="text-sm text-neutral-600">
            خاموش کردن این کلید محصول را فوراً از فروشگاه برمی‌دارد (بدون نیاز
            به ذخیره).
          </p>
        </div>
        <ActiveSwitch
          initialChecked={product.isActive}
          size="lg"
          label="فعال بودن محصول در سایت"
          activeMessage="محصول در سایت نمایش داده می‌شود."
          inactiveMessage="محصول از سایت برداشته شد."
          onToggle={setProductActiveAction.bind(null, product.id)}
        />
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <p className="text-lg font-bold">فعال در سایت</p>
      <Switch
        checked={isActive}
        size="lg"
        label="فعال بودن محصول در سایت"
        onChange={onChange}
      />
    </div>
  );
}
