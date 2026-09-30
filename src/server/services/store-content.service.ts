import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import {
  BUSINESS_KEYS,
  type BusinessSettings,
  defaultBusinessSettings,
  parseBusinessSettings,
} from "@/lib/business-settings";
import {
  defaultHomeSettings,
  HOME_KEYS,
  type HomeSettings,
  parseHomeSettings,
} from "@/lib/home-settings";
import { getSettings } from "@/server/repositories/setting.repository";

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
