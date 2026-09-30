import type { Prisma } from "@prisma/client";
import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import {
  DEFAULT_SITE_SETTINGS,
  parseSiteSettings,
  SITE_CONTENT_KEY,
  type SiteSettings,
} from "@/lib/site-settings";
import {
  getSetting,
  upsertSetting,
} from "@/server/repositories/setting.repository";

import { getBusinessSettings } from "./store-content.service";

/**
 * محتوای قابل ویرایش سایت (یک‌بار در هر درخواست خوانده می‌شود). شماره‌ی تماس
 * تنها منبعش `business.phone` است (تنظیمات ← کسب‌وکار و خدمت) و مقدار قدیمی
 * `site.content.contact.phone` نادیده گرفته می‌شود.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (isBuildWithoutDb()) return DEFAULT_SITE_SETTINGS;
  const [site, business] = await Promise.all([
    getSetting(SITE_CONTENT_KEY),
    getBusinessSettings(),
  ]);
  const settings = parseSiteSettings(site);
  return {
    ...settings,
    contact: { ...settings.contact, phone: business.phone },
  };
});

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  // اینترفیس‌ها index signature ندارند؛ شیء ساده‌ی JSON ذخیره می‌شود
  const value = JSON.parse(JSON.stringify(settings)) as Prisma.InputJsonObject;
  await upsertSetting(SITE_CONTENT_KEY, value);
}
