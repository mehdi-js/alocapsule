import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import {
  BUSINESS_KEYS,
  type BusinessSettings,
  defaultBusinessSettings,
  parseBusinessSettings,
} from "@/lib/business-settings";
import { db } from "@/lib/db";
import {
  defaultHomeSettings,
  HOME_KEYS,
  type HomeSettings,
  parseHomeSettings,
} from "@/lib/home-settings";
import { ORDER_NUMBER_PREFIX_KEY } from "@/lib/order-number";
import type {
  BusinessSettingsInput,
  HomeSettingsInput,
} from "@/lib/validation/store-content";
import { createAuditLog } from "@/server/repositories/audit.repository";
import {
  getSettings,
  upsertSettings,
} from "@/server/repositories/setting.repository";

import { getOrderNumberPrefix } from "./order-number.service";

/** تنظیمات کسب‌وکار (`business.*`، `service.*`، `catalog.*`)؛ یک‌بار در هر درخواست */
export const getBusinessSettings = cache(
  async (): Promise<BusinessSettings> => {
    if (isBuildWithoutDb()) return defaultBusinessSettings();
    const raw = await getSettings(Object.values(BUSINESS_KEYS));
    return parseBusinessSettings(raw as Map<string, unknown>);
  },
);

/** متن‌های صفحه‌ی اصلی (`home.*`)؛ یک‌بار در هر درخواست */
export const getHomeSettings = cache(async (): Promise<HomeSettings> => {
  if (isBuildWithoutDb()) return defaultHomeSettings();
  const raw = await getSettings(Object.values(HOME_KEYS));
  return parseHomeSettings(raw as Map<string, unknown>);
});

/** مقدارهای فرم «کسب‌وکار و خدمت» (شامل پیشوند شماره‌ی سفارش) */
export async function getBusinessSettingsForm(): Promise<
  BusinessSettings & { orderNumberPrefix: string }
> {
  const [business, orderNumberPrefix] = await Promise.all([
    getBusinessSettings(),
    getOrderNumberPrefix(),
  ]);
  return { ...business, orderNumberPrefix };
}

export async function saveBusinessSettings(
  adminId: string,
  input: BusinessSettingsInput,
): Promise<void> {
  await upsertSettings({
    [BUSINESS_KEYS.pickupHours]: input.pickupHours,
    [BUSINESS_KEYS.pickupAddress]: input.pickupAddress,
    [BUSINESS_KEYS.phone]: input.phone,
    [BUSINESS_KEYS.whatsapp]: input.whatsapp,
    [BUSINESS_KEYS.serviceDefaultTerms]: input.serviceDefaultTerms,
    [BUSINESS_KEYS.serviceConsentLabel]: input.serviceConsentLabel,
    [BUSINESS_KEYS.showPricePerKg]: input.showPricePerKg,
    [BUSINESS_KEYS.openHour]: input.openHour,
    [BUSINESS_KEYS.closeHour]: input.closeHour,
    [BUSINESS_KEYS.priceIncludesNote]: input.priceIncludesNote,
    [BUSINESS_KEYS.priceIncludesNoteProducts]: input.priceIncludesNoteProducts,
    [BUSINESS_KEYS.shippingAreaNote]: input.shippingAreaNote,
    [ORDER_NUMBER_PREFIX_KEY]: input.orderNumberPrefix,
  });
  await db.$transaction((tx) =>
    createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.business_updated",
      entityType: "User",
      entityId: adminId,
      // متن بلند شرایط در لاگ نمی‌آید؛ فقط مقدارهای کوتاه
      metadata: {
        phone: input.phone,
        pickupHours: input.pickupHours,
        showPricePerKg: input.showPricePerKg,
        orderNumberPrefix: input.orderNumberPrefix,
      },
    }),
  );
}

export async function saveHomeSettings(
  adminId: string,
  input: HomeSettingsInput,
): Promise<void> {
  await upsertSettings({
    [HOME_KEYS.heroTitle]: input.heroTitle,
    [HOME_KEYS.heroSubtitle]: input.heroSubtitle,
    [HOME_KEYS.heroPrimaryCta]: input.heroPrimaryCta,
    [HOME_KEYS.heroPrimaryHref]: input.heroPrimaryHref,
    [HOME_KEYS.heroSecondaryCta]: input.heroSecondaryCta,
    [HOME_KEYS.stepsTitle]: input.stepsTitle,
    [HOME_KEYS.steps]: input.steps,
    [HOME_KEYS.featuredTitle]: input.featuredTitle,
    [HOME_KEYS.aboutTitle]: input.aboutTitle,
    [HOME_KEYS.aboutText]: input.aboutText,
    [HOME_KEYS.customersTitle]: input.customersTitle,
    [HOME_KEYS.customers]: input.customers,
    [HOME_KEYS.stats]: input.stats,
    [HOME_KEYS.ctaTitle]: input.ctaTitle,
    [HOME_KEYS.ctaText]: input.ctaText,
  });
  await db.$transaction((tx) =>
    createAuditLog(tx, {
      actorUserId: adminId,
      action: "settings.home_updated",
      entityType: "User",
      entityId: adminId,
      metadata: { statsCount: input.stats.length },
    }),
  );
}
