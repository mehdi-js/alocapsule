import type { Metadata } from "next";

import { BusinessSettingsForm } from "@/components/admin/settings/BusinessSettingsForm";
import { getBusinessSettingsForm } from "@/server/services/store-content.service";

export const metadata: Metadata = { title: "کسب‌وکار و خدمت" };

export default async function BusinessSettingsPage() {
  const settings = await getBusinessSettingsForm();
  return (
    <BusinessSettingsForm key={JSON.stringify(settings)} initial={settings} />
  );
}
