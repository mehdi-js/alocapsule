import type { Metadata } from "next";

import { MenusManager } from "@/components/admin/menus/MenusManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import { listMenus } from "@/server/services/menu-query.service";

export const metadata: Metadata = { title: "منوی شعبه‌ها" };

export default async function MenusPage() {
  await requireAdmin();
  const menus = await listMenus();
  return (
    <>
      <PageHeader title="منوی شعبه‌ها" crumbs={[{ label: "منوها" }]} />
      <MenusManager menus={menus} />
    </>
  );
}
