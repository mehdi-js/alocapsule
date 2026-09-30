import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { SITE } from "@/lib/site-content";
import { requireAdmin } from "@/server/auth/current-user";
import {
  getCategoryForEdit,
  listCategories,
} from "@/server/services/category.service";
import { getTitleSettings } from "@/server/services/seo-settings.service";

export const metadata: Metadata = { title: "ویرایش دسته‌بندی" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [category, categories, titleSettings] = await Promise.all([
    getCategoryForEdit(id),
    listCategories(),
    getTitleSettings(),
  ]);
  if (!category) notFound();

  return (
    <>
      <PageHeader
        title={category.name}
        crumbs={[
          { label: "دسته‌بندی‌ها", href: "/admin/categories" },
          { label: "ویرایش" },
        ]}
      />
      <CategoryForm
        key={category.id}
        category={category}
        categories={categories}
        titleSettings={titleSettings}
        siteUrl={SITE.url}
      />
    </>
  );
}
