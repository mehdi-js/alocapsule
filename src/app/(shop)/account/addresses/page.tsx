import type { Metadata } from "next";

import { AddressManager } from "@/components/shop/account/AddressManager";
import { requireUser } from "@/server/auth/current-user";
import { listAddresses } from "@/server/services/address.service";

export const metadata: Metadata = { title: "آدرس‌ها" };

export default async function MyAddressesPage() {
  const user = await requireUser();
  const addresses = await listAddresses(user.id);
  return (
    <AddressManager
      initial={addresses}
      defaults={{
        receiverName: user.fullName ?? "",
        receiverPhone: user.phone,
      }}
    />
  );
}
