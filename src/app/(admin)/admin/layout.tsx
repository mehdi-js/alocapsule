import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/ui/Toast";
import { logoutAction } from "@/server/actions/auth";
import { requireAdmin } from "@/server/auth/current-user";
import { getMaintenance } from "@/server/services/maintenance.service";

export const metadata: Metadata = {
  title: { default: "مدیریت | علی حان", template: "%s | مدیریت علی حان" },
  robots: { index: false, follow: false },
};

/** پنل ادمین همیشه پویا (به نشست و داده‌ی زنده وابسته؛ هنگام build پیش‌رندر نمی‌شود) */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // لایه‌ی دوم محافظت؛ لایه‌ی اول middleware است.
  const user = await requireAdmin();
  const maintenance = await getMaintenance();

  return (
    <ToastProvider>
      <AdminShell
        userPhone={user.phone}
        logoutAction={logoutAction}
        maintenance={maintenance.enabled}
      >
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
