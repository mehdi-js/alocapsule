import Link from "next/link";

import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatJalaliDateTime } from "@/lib/date";
import { formatToman } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment";
import { toPersianDigits } from "@/lib/utils";
import type { PaymentRowDto } from "@/server/services/payment-review-query.service";

import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadges";

export function PaymentsTable({ rows }: { rows: PaymentRowDto[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>سفارش</TH>
          <TH>مشتری</TH>
          <TH>مبلغ</TH>
          <TH>روش</TH>
          <TH>ثبت</TH>
          <TH>پرداخت</TH>
          <TH>سفارش</TH>
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
              {formatToman(row.amount)} تومان
            </TD>
            <TD className="whitespace-nowrap">
              {PAYMENT_METHOD_LABELS[row.method]}
            </TD>
            <TD className="whitespace-nowrap">
              {formatJalaliDateTime(row.createdAt)}
            </TD>
            <TD>
              <PaymentStatusBadge status={row.status} />
            </TD>
            <TD>
              <OrderStatusBadge status={row.orderStatus} />
            </TD>
            <TD>
              <Link
                href={`/admin/payments/${row.id}`}
                className="font-medium text-neutral-900 underline-offset-4 hover:underline"
              >
                {row.status === "SUBMITTED" ? "بررسی" : "جزئیات"}
              </Link>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
