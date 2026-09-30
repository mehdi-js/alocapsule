import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { SITE } from "@/lib/site-content";
import { requireAdmin } from "@/server/auth/current-user";
import { listCategories } from "@/server/services/category.service";
import { getTitleSettings } from "@/server/services/seo-settings.service";

export const metadata: Metadata = { title: "محصول جدید" };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, titleSettings] = await Promise.all([
    listCategories(),
    getTitleSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="محصول جدید"
        crumbs={[
          { label: "محصولات", href: "/admin/products" },
          { label: "محصول جدید" },
        ]}
      />
      <p className="mb-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
        تصاویر محصول بعد از ساخت آن، در صفحه‌ی ویرایش اضافه می‌شوند.
      </p>
      <ProductForm
        categories={categories}
        images={[]}
        titleSettings={titleSettings}
        siteUrl={SITE.url}
      />
    </>
  );
}
