import type { Metadata } from "next";

import { CouponForm } from "@/components/admin/coupons/CouponForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import { getScopeOptions } from "@/server/services/coupon-admin.service";

export const metadata: Metadata = { title: "کد تخفیف جدید" };

export default async function NewCouponPage() {
  await requireAdmin();
  const { categories, products } = await getScopeOptions();
  return (
    <>
      <PageHeader
        title="کد تخفیف جدید"
        crumbs={[
          { label: "کدهای تخفیف", href: "/admin/coupons" },
          { label: "کد جدید" },
        ]}
      />
      <CouponForm categories={categories} products={products} />
    </>
  );
}
