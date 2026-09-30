import Link from "next/link";

import { ActiveSwitch } from "@/components/admin/ActiveSwitch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalali } from "@/lib/date";
import { toPersianDigits } from "@/lib/utils";
import { setCouponActiveAction } from "@/server/actions/coupon";
import type { CouponListItem } from "@/server/services/coupon-admin.service";

import { CouponStatusBadge } from "./CouponStatusBadge";
import { DeleteCouponButton } from "./DeleteCouponButton";

const SCOPE_LABELS = {
  ALL: "همه‌ی محصولات",
  CATEGORY: "دسته‌بندی‌ها",
  PRODUCT: "محصولات",
};

function range(item: CouponListItem): string {
  if (!item.startsAt && !item.expiresAt) return "بدون محدودیت زمانی";
  const from = item.startsAt ? formatJalali(item.startsAt) : "…";
  const to = item.expiresAt ? formatJalali(item.expiresAt) : "…";
  return `${from} تا ${to}`;
}

export function CouponsTable({ items }: { items: CouponListItem[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>کد</TH>
          <TH>تخفیف</TH>
          <TH>دامنه</TH>
          <TH>استفاده</TH>
          <TH>بازه‌ی اعتبار</TH>
          <TH>وضعیت</TH>
          <TH>فعال</TH>
          <TH>
            <span className="sr-only">عملیات</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {items.map((item) => (
          <TR key={item.id}>
            <TD>
              <Link
                href={`/admin/coupons/${item.id}`}
                dir="ltr"
                className="font-mono font-bold hover:underline"
              >
                {item.code}
              </Link>
              <div className="text-xs text-neutral-500">{item.title}</div>
            </TD>
            <TD className="whitespace-nowrap">{item.description}</TD>
            <TD>{SCOPE_LABELS[item.scope]}</TD>
            <TD className="whitespace-nowrap">
              {toPersianDigits(item.usedCount)}
              {item.usageLimitTotal !== null
                ? ` از ${toPersianDigits(item.usageLimitTotal)}`
                : ""}
            </TD>
            <TD className="text-xs whitespace-nowrap">{range(item)}</TD>
            <TD>
              <CouponStatusBadge status={item.status} />
            </TD>
            <TD>
              <ActiveSwitch
                key={`${item.id}-${item.isActive}`}
                initialChecked={item.isActive}
                label={`فعال بودن کد ${item.code}`}
                activeMessage="کد تخفیف فعال شد."
                inactiveMessage="کد تخفیف غیرفعال شد."
                onToggle={setCouponActiveAction.bind(null, item.id)}
              />
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/admin/coupons/${item.id}`}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100"
                >
                  گزارش
                </Link>
                <Link
                  href={`/admin/coupons/${item.id}/edit`}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100"
                >
                  ویرایش
                </Link>
                <DeleteCouponButton id={item.id} code={item.code} />
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
