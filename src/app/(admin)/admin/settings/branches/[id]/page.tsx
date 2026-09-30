import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BranchForm } from "@/components/admin/content/BranchForm";
import { getBranch } from "@/server/services/branch.service";

export const metadata: Metadata = { title: "ویرایش شعبه" };

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const branch = await getBranch((await params).id);
  if (!branch) notFound();
  return <BranchForm key={branch.id} branch={branch} />;
}
