import type { Metadata } from "next";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { SITE } from "@/lib/site-content";
import { requireAdmin } from "@/server/auth/current-user";
import { listCategories } from "@/server/services/category.service";
import { getTitleSettings } from "@/server/services/seo-settings.service";

export const metadata: Metadata = { title: "دسته‌بندی جدید" };

export default async function NewCategoryPage() {
  await requireAdmin();
  const [categories, titleSettings] = await Promise.all([
    listCategories(),
    getTitleSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="دسته‌بندی جدید"
        crumbs={[
          { label: "دسته‌بندی‌ها", href: "/admin/categories" },
          { label: "دسته‌بندی جدید" },
        ]}
      />
      <CategoryForm
        category={null}
        categories={categories}
        titleSettings={titleSettings}
        siteUrl={SITE.url}
      />
    </>
  );
}
