import type { Metadata } from "next";

import { ServerEnvTable } from "@/components/admin/settings/ServerEnvTable";
import { SmsConnectionForm } from "@/components/admin/settings/SmsConnectionForm";
import { getServerEnvStatus } from "@/server/services/server-env.service";
import { getSmsConnection } from "@/server/services/sms-connection.service";

export const metadata: Metadata = { title: "اتصال‌ها و سرور" };

export default async function ServerSettingsPage() {
  const connection = await getSmsConnection();
  return (
    <div className="space-y-8">
      <SmsConnectionForm
        key={JSON.stringify(connection)}
        connection={connection}
      />
      <ServerEnvTable groups={getServerEnvStatus()} />
    </div>
  );
}
