import { socialLinks } from "@/lib/site-settings";
import { getSiteSettings } from "@/server/services/site-settings.service";
import { getBusinessSettings } from "@/server/services/store-content.service";

import { TopNav } from "./TopNav";

/** هدر فروشگاه؛ شماره‌ی تماس از `business.phone` (TopNav کلاینتی است) */
export async function ShopHeader() {
  const [{ social }, business] = await Promise.all([
    getSiteSettings(),
    getBusinessSettings(),
  ]);
  return (
    <TopNav contact={{ phone: business.phone, social: socialLinks(social) }} />
  );
}
