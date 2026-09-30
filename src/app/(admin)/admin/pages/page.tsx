import type { Metadata } from "next";

import { PagesList } from "@/components/admin/content/PagesList";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import { listPages } from "@/server/services/page.service";

export const metadata: Metadata = { title: "صفحات" };

export default async function PagesPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="صفحات" crumbs={[{ label: "صفحات" }]} />
      <PagesList pages={await listPages()} />
    </>
  );
}
