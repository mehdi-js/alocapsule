import type { Metadata } from "next";
import Link from "next/link";

import { CouponsTable } from "@/components/admin/coupons/CouponsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/server/auth/current-user";
import { listCoupons } from "@/server/services/coupon-admin.service";

export const metadata: Metadata = { title: "کدهای تخفیف" };

export default async function CouponsPage() {
  await requireAdmin();
  const coupons = await listCoupons();
  const newButton = (
    <Link href="/admin/coupons/new" className={buttonClasses("primary")}>
      کد تخفیف جدید
    </Link>
  );

  return (
    <>
      <PageHeader
        title="کدهای تخفیف"
        crumbs={[{ label: "کدهای تخفیف" }]}
        actions={newButton}
      />
      {coupons.length === 0 ? (
        <EmptyState
          title="هنوز کد تخفیفی ساخته نشده است"
          description="کد درصدی، مبلغ ثابت یا ارسال رایگان بسازید."
          action={newButton}
        />
      ) : (
        <CouponsTable items={coupons} />
      )}
    </>
  );
}
