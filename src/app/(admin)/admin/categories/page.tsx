import type { Metadata } from "next";

import { CategoryManager } from "@/components/admin/CategoryManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import { listCategoriesWithSeo } from "@/server/services/category.service";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await listCategoriesWithSeo();

  return (
    <>
      <PageHeader title="دسته‌بندی‌ها" crumbs={[{ label: "دسته‌بندی‌ها" }]} />
      <CategoryManager categories={categories} />
    </>
  );
}
