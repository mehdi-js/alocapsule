import type { Metadata } from "next";

import { HomeSettingsForm } from "@/components/admin/settings/HomeSettingsForm";
import { getHomeSettings } from "@/server/services/store-content.service";

export const metadata: Metadata = { title: "متن‌های صفحه‌ی اصلی" };

export default async function HomeSettingsPage() {
  const settings = await getHomeSettings();
  return <HomeSettingsForm key={JSON.stringify(settings)} initial={settings} />;
}
