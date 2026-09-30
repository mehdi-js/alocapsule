import type { Metadata } from "next";

import { BankCardsManager } from "@/components/admin/settings/BankCardsManager";
import { listBankCards } from "@/server/services/store-settings.service";

export const metadata: Metadata = { title: "کارت‌های بانکی" };

export default async function BankCardsSettingsPage() {
  const cards = await listBankCards();
  return <BankCardsManager cards={cards} />;
}
