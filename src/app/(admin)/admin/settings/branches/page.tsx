import type { Metadata } from "next";

import { BranchesList } from "@/components/admin/content/BranchesList";
import { listBranches } from "@/server/services/branch.service";

export const metadata: Metadata = { title: "شعب" };

export default async function BranchesSettingsPage() {
  return <BranchesList branches={await listBranches()} />;
}
