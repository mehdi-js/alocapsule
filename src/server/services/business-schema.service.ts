import { businessLocationJsonLd } from "@/lib/seo/jsonld";
import { BRAND_TAGLINE } from "@/lib/seo/settings";
import { SERVICE_AREAS } from "@/lib/service-area";
import { socialLinks } from "@/lib/site-settings";

import { getSeoContext, getSeoSettings } from "./seo-settings.service";
import { getSiteSettings } from "./site-settings.service";
import { getBusinessSettings } from "./store-content.service";

/** آدرس کامل شبکه‌ی اجتماعی فقط اگر به صفحه‌ی مشخصی اشاره کند (نه دامنه‌ی خالی) */
export function profileUrls(hrefs: string[]): string[] {
  return hrefs.filter((href) => {
    try {
      return new URL(href).pathname.replace(/\/+$/, "") !== "";
    } catch {
      return false;
    }
  });
}

/**
 * `LocalBusiness` صفحه‌ی اصلی، درباره ما و تماس (SEO.md §۶.۱). همه از `Setting`
 * (همان منبع فوتر و صفحه‌ی تماس)؛ تلفن، ایمیل و آدرس یکسان در همه‌جا. ساعات
 * کاری تا تکمیل روزهای هفته در خروجی نمی‌آید.
 */
export async function getLocalBusinessJsonLd(): Promise<
  Record<string, unknown>
> {
  const [context, seo, site, business] = await Promise.all([
    getSeoContext(),
    getSeoSettings(),
    getSiteSettings(),
    getBusinessSettings(),
  ]);
  return businessLocationJsonLd({
    siteUrl: context.siteUrl,
    brandName: seo.brandName,
    alternateNames: seo.alternateNames,
    description: BRAND_TAGLINE,
    phone: business.phone || null,
    email: site.contact.email || null,
    streetAddress: site.contact.address || null,
    city: SERVICE_AREAS[0]?.province ?? "تهران",
    sameAs: profileUrls(socialLinks(site.social).map((s) => s.href)),
  });
}
