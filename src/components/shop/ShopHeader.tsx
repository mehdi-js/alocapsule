import { socialLinks } from "@/lib/site-settings";
import { getSiteSettings } from "@/server/services/site-settings.service";

import { TopNav } from "./TopNav";

/** هدر فروشگاه با اطلاعات تماس تنظیمات (TopNav کلاینتی است) */
export async function ShopHeader() {
  const { contact, social } = await getSiteSettings();
  return (
    <TopNav contact={{ phone: contact.phone, social: socialLinks(social) }} />
  );
}
