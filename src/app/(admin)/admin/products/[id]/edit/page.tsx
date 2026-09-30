import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/PageHeader";
import { ProductEditView } from "@/components/admin/ProductEditView";
import { SITE } from "@/lib/site-content";
import { requireAdmin } from "@/server/auth/current-user";
import { listCategories } from "@/server/services/category.service";
import { getProductForEdit } from "@/server/services/product-query.service";
import { getTitleSettings } from "@/server/services/seo-settings.service";
import { getBusinessSettings } from "@/server/services/store-content.service";

export const metadata: Metadata = { title: "ویرایش محصول" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories, titleSettings, business] = await Promise.all([
    getProductForEdit(id),
    listCategories(),
    getTitleSettings(),
    getBusinessSettings(),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        crumbs={[
          { label: "محصولات", href: "/admin/products" },
          { label: "ویرایش" },
        ]}
      />
      {product.archivedAt ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          این محصول بایگانی شده و آدرسش به{" "}
          <span dir="ltr">{product.archiveRedirectTo}</span> ریدایرکت می‌شود.
          برای بازگردانی از لیست محصولات (فیلتر «بایگانی‌شده») اقدام کنید.
        </p>
      ) : null}
      <ProductEditView
        key={product.id}
        product={product}
        categories={categories}
        titleSettings={titleSettings}
        siteUrl={SITE.url}
        defaultServiceTerms={business.serviceDefaultTerms}
      />
    </>
  );
}
