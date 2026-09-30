import type { Metadata } from "next";

import { BranchForm } from "@/components/admin/content/BranchForm";

export const metadata: Metadata = { title: "شعبه‌ی جدید" };

export default function NewBranchPage() {
  return <BranchForm branch={null} />;
}
