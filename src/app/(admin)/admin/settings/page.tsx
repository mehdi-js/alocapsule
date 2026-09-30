import type { Metadata } from "next";

import { GeneralSettingsForm } from "@/components/admin/settings/GeneralSettingsForm";
import { MaintenanceCard } from "@/components/admin/settings/MaintenanceCard";
import { enamadSnippet } from "@/lib/enamad";
import { getMaintenance } from "@/server/services/maintenance.service";
import { getGeneralSettings } from "@/server/services/store-settings.service";

export const metadata: Metadata = { title: "تنظیمات" };

export default async function GeneralSettingsPage() {
  const [{ maxQuantityPerItem, site }, maintenance] = await Promise.all([
    getGeneralSettings(),
    getMaintenance(),
  ]);
  return (
    <div className="space-y-6">
      <MaintenanceCard
        key={JSON.stringify(maintenance)}
        enabled={maintenance.enabled}
        message={maintenance.message}
      />
      <GeneralSettingsForm
        key={JSON.stringify({ maxQuantityPerItem, site })}
        initial={{
          maxQuantityPerItem,
          contact: site.contact,
          social: site.social,
          trustItems: site.trustItems,
          aboutStats: site.aboutStats,
          shippingNote: site.shippingNote,
          enamad: site.enamad ? enamadSnippet(site.enamad) : "",
        }}
      />
    </div>
  );
}
