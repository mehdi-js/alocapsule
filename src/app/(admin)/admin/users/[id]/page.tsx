import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import { OrderStatusBadge } from "@/components/admin/payments/StatusBadges";
import { UserEditForm } from "@/components/admin/users/UserEditForm";
import { WalletAdjustForm } from "@/components/admin/users/WalletAdjustForm";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalali, formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";
import { WALLET_REASON_LABELS } from "@/lib/wallet";
import { requireAdmin } from "@/server/auth/current-user";
import { getUserForAdmin } from "@/server/services/user-admin.service";

export const metadata: Metadata = { title: "مدیریت کاربر" };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** ویرایش کاربر، شارژ/کسر کیف پول و تاریخچه‌ی تراکنش‌ها و سفارش‌ها */
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const detail = await getUserForAdmin((await params).id);
  if (!detail) notFound();
  const { user } = detail;

  return (
    <>
      <PageHeader
        title={user.fullName ?? toPersianDigits(user.phone)}
        crumbs={[
          { label: "کاربران", href: "/admin/users" },
          { label: toPersianDigits(user.phone) },
        ]}
      />
      <p className="mb-6 text-sm text-neutral-600">
        <span dir="ltr">{toPersianDigits(user.phone)}</span> · عضویت{" "}
        {formatJalali(user.createdAt)} · {toPersianDigits(user.orderCount)}{" "}
        سفارش
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="اطلاعات کاربر">
          <UserEditForm
            userId={user.id}
            isSelf={user.id === admin.id}
            initial={{
              fullName: user.fullName ?? "",
              email: user.email ?? "",
              role: user.role,
              isActive: user.isActive,
            }}
          />
        </Card>
        <Card title="کیف پول">
          <WalletAdjustForm userId={user.id} balance={user.walletBalance} />
        </Card>
      </div>

      <div className="mt-6 space-y-6">
        <Card title="تاریخچه‌ی تراکنش‌های کیف پول">
          {detail.wallet.length === 0 ? (
            <p className="text-sm text-neutral-500">تراکنشی ثبت نشده است.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>زمان</TH>
                  <TH>شرح</TH>
                  <TH>مبلغ</TH>
                  <TH>موجودی پس از آن</TH>
                  <TH>یادداشت</TH>
                  <TH>ثبت توسط</TH>
                </tr>
              </THead>
              <TBody>
                {detail.wallet.map((tx) => (
                  <TR key={tx.id}>
                    <TD className="whitespace-nowrap">
                      {formatJalaliDateTime(tx.createdAt)}
                    </TD>
                    <TD>
                      {WALLET_REASON_LABELS[tx.reason]}
                      {tx.order ? (
                        <Link
                          href={`/admin/orders/${tx.order.id}`}
                          dir="ltr"
                          className="ms-2 font-mono text-xs underline-offset-4 hover:underline"
                        >
                          {tx.order.orderNumber}
                        </Link>
                      ) : null}
                    </TD>
                    <TD
                      dir="ltr"
                      className={
                        tx.type === "CREDIT"
                          ? "text-start font-medium text-emerald-700"
                          : "text-start font-medium text-red-700"
                      }
                    >
                      {tx.type === "CREDIT" ? "+" : "−"}
                      {formatToman(tx.amount)}
                    </TD>
                    <TD>{formatToman(tx.balanceAfter)}</TD>
                    <TD className="text-neutral-600">{tx.note ?? "—"}</TD>
                    <TD className="text-neutral-600">
                      {tx.createdBy ? toPersianDigits(tx.createdBy) : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card title="سفارش‌های اخیر">
          {detail.orders.length === 0 ? (
            <p className="text-sm text-neutral-500">سفارشی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Link
                    href={`/admin/orders/${order.id}`}
                    dir="ltr"
                    className="font-mono underline-offset-4 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <OrderStatusBadge status={order.status} />
                  <span>{formatToman(order.grandTotal)} تومان</span>
                  <span className="text-neutral-500">
                    {formatJalali(order.placedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
