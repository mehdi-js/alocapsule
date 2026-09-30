import type { Prisma } from "@prisma/client";
import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { isIndexingAllowed } from "@/lib/seo/indexing";
import type { SeoContext } from "@/lib/seo/metadata";
import {
  defaultSeoSettings,
  parseSeoSettings,
  SEO_KEYS,
  type SeoSettings,
} from "@/lib/seo/settings";
import type { TitleSettings } from "@/lib/seo/title";
import { SITE } from "@/lib/site-content";
import type { SeoSettingsInput } from "@/lib/validation/seo-settings";
import {
  getSettings,
  upsertSettings,
} from "@/server/repositories/setting.repository";

/** همه‌ی کلیدهای سئو (یک‌بار در هر درخواست) */
export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  if (isBuildWithoutDb()) return defaultSeoSettings();
  const raw = await getSettings(Object.values(SEO_KEYS));
  return parseSeoSettings(raw as Map<string, unknown>);
});

/** نام برند از `seo.brandName`؛ خالی یا نامعتبر ⇒ `SITE.name` */
export async function getBrandName(): Promise<string> {
  return (await getSeoSettings()).brandName;
}

export async function getTitleSettings(): Promise<TitleSettings> {
  const { brandName, titleTemplate } = await getSeoSettings();
  return { brandName, titleTemplate };
}

/** ورودی سازنده‌های Metadata صفحات عمومی */
export async function getSeoContext(): Promise<SeoContext> {
  const settings = await getSeoSettings();
  return {
    siteUrl: SITE.url,
    brandName: settings.brandName,
    titleTemplate: settings.titleTemplate,
    defaultDescription: settings.defaultDescription,
    defaultOgImage: settings.defaultOgImage || null,
    allowIndexing: isIndexingAllowed(),
  };
}

/** ذخیره‌ی «تنظیمات سئو»؛ هر کلید جدا (SEO.md §۶.۵) */
export async function saveSeoSettings(input: SeoSettingsInput): Promise<void> {
  const values: Record<string, Prisma.InputJsonValue> = {
    [SEO_KEYS.brandName]: input.brandName,
    [SEO_KEYS.alternateNames]: input.alternateNames,
    [SEO_KEYS.titleTemplate]: input.titleTemplate,
    [SEO_KEYS.defaultDescription]: input.defaultDescription,
    [SEO_KEYS.defaultOgImage]: input.defaultOgImage,
    [SEO_KEYS.homeTitle]: input.homeTitle,
    [SEO_KEYS.homeDescription]: input.homeDescription,
    [SEO_KEYS.homeH1]: input.homeH1,
    [SEO_KEYS.homeContent]: input.homeContent,
    [SEO_KEYS.homeFaq]: input.homeFaq,
    [SEO_KEYS.orgLegalName]: input.orgLegalName,
    [SEO_KEYS.orgLogoUrl]: input.orgLogoUrl,
    [SEO_KEYS.verificationGoogle]: input.verificationGoogle,
    [SEO_KEYS.verificationBing]: input.verificationBing,
  };
  await upsertSettings(values);
}
