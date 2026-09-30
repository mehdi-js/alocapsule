import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalali } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { cn, toPersianDigits } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/current-user";
import { listUsers } from "@/server/services/user-admin.service";

export const metadata: Metadata = { title: "کاربران" };

const badge = "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const q = ((await searchParams).q ?? "").slice(0, 60);
  const { rows, total } = await listUsers(q);

  return (
    <>
      <PageHeader title="کاربران" crumbs={[{ label: "کاربران" }]} />
      <form role="search" className="mb-5 flex flex-wrap gap-3">
        <label htmlFor="user-search" className="sr-only">
          جستجوی کاربر
        </label>
        <Input
          id="user-search"
          name="q"
          defaultValue={q}
          placeholder="شماره‌ی موبایل، نام یا ایمیل"
          className="max-w-sm"
        />
        <button type="submit" className={buttonClasses("secondary")}>
          جستجو
        </button>
      </form>
      <p className="mb-3 text-sm text-neutral-500">
        {toPersianDigits(total)} کاربر
        {total > rows.length
          ? ` (نمایش ${toPersianDigits(rows.length)} مورد اول)`
          : ""}
      </p>
      {rows.length === 0 ? (
        <EmptyState title="کاربری پیدا نشد" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>موبایل</TH>
              <TH>نام</TH>
              <TH>نقش</TH>
              <TH>وضعیت</TH>
              <TH>کیف پول</TH>
              <TH>سفارش‌ها</TH>
              <TH>عضویت</TH>
              <TH>
                <span className="sr-only">عملیات</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((user) => (
              <TR key={user.id}>
                <TD dir="ltr" className="text-start">
                  {toPersianDigits(user.phone)}
                </TD>
                <TD>{user.fullName ?? "—"}</TD>
                <TD>
                  <span
                    className={cn(
                      badge,
                      user.role === "ADMIN"
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-neutral-100 text-neutral-600",
                    )}
                  >
                    {user.role === "ADMIN" ? "ادمین" : "مشتری"}
                  </span>
                </TD>
                <TD>
                  <span
                    className={cn(
                      badge,
                      user.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700",
                    )}
                  >
                    {user.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </TD>
                <TD className="whitespace-nowrap">
                  {formatToman(user.walletBalance)} تومان
                </TD>
                <TD>{toPersianDigits(user.orderCount)}</TD>
                <TD className="whitespace-nowrap">
                  {formatJalali(user.createdAt)}
                </TD>
                <TD>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    مدیریت
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
