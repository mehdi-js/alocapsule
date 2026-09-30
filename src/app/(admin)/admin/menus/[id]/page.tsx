import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MenuEditor } from "@/components/admin/menus/MenuEditor";
import { MenuQrCard } from "@/components/admin/menus/MenuQrCard";
import { MenuSettingsActions } from "@/components/admin/menus/MenuSettingsActions";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import {
  getMenuForEditor,
  menuQrSvg,
  menuUrl,
} from "@/server/services/menu-query.service";

export const metadata: Metadata = { title: "ویرایش منو" };

export default async function MenuEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const menu = await getMenuForEditor((await params).id);
  if (!menu) notFound();
  const svg = await menuQrSvg(menu.slug);

  return (
    <>
      <PageHeader
        title={menu.name}
        crumbs={[
          { label: "منوها", href: "/admin/menus" },
          { label: menu.name },
        ]}
        actions={
          <MenuSettingsActions
            menu={{
              id: menu.id,
              name: menu.name,
              slug: menu.slug,
              description: menu.description,
              isActive: menu.isActive,
            }}
          />
        }
      />
      <div className="space-y-6">
        <MenuQrCard
          menuId={menu.id}
          slug={menu.slug}
          url={menuUrl(menu.slug)}
          svg={svg}
          isActive={menu.isActive}
        />
        <MenuEditor menuId={menu.id} categories={menu.categories} />
      </div>
    </>
  );
}
