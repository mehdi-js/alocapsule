import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import type { ContentTokenValues } from "@/lib/content-tokens";
import { toPersianDigits } from "@/lib/utils";
import { listAllShippingMethods } from "@/server/repositories/shipping.repository";

import { getBusinessSettings } from "./store-content.service";

/**
 * مقدارهای توکن‌های متن (`[[normal.estimate]]` …) از روش‌های ارسال و ساعت
 * تحویل حضوری. روش فوری = `businessHoursOnly`؛ روش عادی = اولین روش دارای
 * آدرس که فوری نیست. غیرفعال بودن روش در **متن** اثری ندارد (قیمت و فعال‌سازی
 * جداست)؛ فقط مقدار «زمان تحویل» خوانده می‌شود.
 */
export const getContentTokenValues = cache(
  async (): Promise<ContentTokenValues> => {
    if (isBuildWithoutDb()) return {};
    const [methods, business] = await Promise.all([
      listAllShippingMethods(),
      getBusinessSettings(),
    ]);
    const express = methods.find((method) => method.businessHoursOnly);
    const normal = methods.find(
      (method) => method.requiresAddress && !method.businessHoursOnly,
    );
    return {
      "normal.estimate": normal?.deliveryEstimate ?? undefined,
      "express.estimate": express?.deliveryEstimate ?? undefined,
      "free.quantity":
        normal?.freeAboveQuantity != null
          ? toPersianDigits(normal.freeAboveQuantity)
          : undefined,
      "pickup.hours": business.pickupHours,
    };
  },
);
