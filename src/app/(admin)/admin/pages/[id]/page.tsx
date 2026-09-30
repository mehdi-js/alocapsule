import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageForm } from "@/components/admin/content/PageForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import { FIXED_PAGE_SLUGS, getPage } from "@/server/services/page.service";

export const metadata: Metadata = { title: "ویرایش صفحه" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const page = await getPage((await params).id);
  if (!page) notFound();
  return (
    <>
      <PageHeader
        title={page.title}
        crumbs={[{ label: "صفحات", href: "/admin/pages" }, { label: "ویرایش" }]}
      />
      <PageForm
        key={page.id}
        page={page}
        fixed={FIXED_PAGE_SLUGS.has(page.slug)}
      />
    </>
  );
}
