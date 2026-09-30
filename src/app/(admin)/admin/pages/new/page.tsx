import type { Metadata } from "next";

import { PageForm } from "@/components/admin/content/PageForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "صفحه‌ی جدید" };

export default async function NewPagePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="صفحه‌ی جدید"
        crumbs={[{ label: "صفحات", href: "/admin/pages" }, { label: "جدید" }]}
      />
      <PageForm page={null} fixed={false} />
    </>
  );
}
