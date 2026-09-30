import type { Metadata } from "next";

import { ShippingManager } from "@/components/admin/settings/ShippingManager";
import { listShippingMethods } from "@/server/services/store-settings.service";

export const metadata: Metadata = { title: "روش‌های ارسال" };

export default async function ShippingSettingsPage() {
  const methods = await listShippingMethods();
  return <ShippingManager methods={methods} />;
}
