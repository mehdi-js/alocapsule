import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CouponForm } from "@/components/admin/coupons/CouponForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import {
  getCouponForEdit,
  getScopeOptions,
} from "@/server/services/coupon-admin.service";

export const metadata: Metadata = { title: "ویرایش کد تخفیف" };

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [coupon, { categories, products }] = await Promise.all([
    getCouponForEdit(id),
    getScopeOptions(),
  ]);
  if (!coupon) notFound();

  return (
    <>
      <PageHeader
        title={`ویرایش ${coupon.code}`}
        crumbs={[
          { label: "کدهای تخفیف", href: "/admin/coupons" },
          { label: "ویرایش" },
        ]}
      />
      <CouponForm
        key={coupon.id}
        coupon={coupon}
        categories={categories}
        products={products}
      />
    </>
  );
}
