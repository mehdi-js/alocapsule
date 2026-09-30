import type { ReactNode } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsTabs } from "@/components/admin/settings/SettingsTabs";
import { requireAdmin } from "@/server/auth/current-user";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="تنظیمات" crumbs={[{ label: "تنظیمات" }]} />
      <SettingsTabs />
      {children}
    </>
  );
}
