import Link from "next/link";

import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";
import type { AdminOrderRowDto } from "@/server/services/order-admin.service";

import { OrderStatusBadge } from "../payments/StatusBadges";

export function OrdersTable({ rows }: { rows: AdminOrderRowDto[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>سفارش</TH>
          <TH>مشتری</TH>
          <TH>مبلغ</TH>
          <TH>روش ارسال</TH>
          <TH>ثبت</TH>
          <TH>پرداخت</TH>
          <TH>وضعیت</TH>
          <TH>
            <span className="sr-only">عملیات</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD dir="ltr" className="text-start font-mono whitespace-nowrap">
              {row.orderNumber}
            </TD>
            <TD>
              <span dir="ltr">{toPersianDigits(row.customerPhone)}</span>
              {row.customerName ? (
                <span className="block text-xs text-neutral-500">
                  {row.customerName}
                </span>
              ) : null}
            </TD>
            <TD className="whitespace-nowrap">
              {formatToman(row.grandTotal)} تومان
            </TD>
            <TD className="whitespace-nowrap">{row.shippingMethodName}</TD>
            <TD className="whitespace-nowrap">
              {formatJalaliDateTime(row.placedAt)}
            </TD>
            <TD className="whitespace-nowrap">
              {row.paidAt ? formatJalaliDateTime(row.paidAt) : "—"}
            </TD>
            <TD>
              <OrderStatusBadge status={row.status} />
            </TD>
            <TD>
              <Link
                href={`/admin/orders/${row.id}`}
                className="font-medium text-neutral-900 underline-offset-4 hover:underline"
              >
                {row.status === "PROCESSING" ? "ارسال" : "جزئیات"}
              </Link>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
