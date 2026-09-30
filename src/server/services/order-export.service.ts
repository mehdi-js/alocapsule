import { toCsv } from "@/lib/csv";
import { formatJalali, formatJalaliDateTime } from "@/lib/date";
import { itemLabel } from "@/lib/item-label";
import type { OrderFilters } from "@/lib/order-filters";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { findOrdersForExport } from "@/server/repositories/order-admin.repository";

import { parseAddressSnapshot } from "./order-query.service";

const PICKUP_LABEL = "تحویل حضوری";

/** سقف ردیف‌های هر خروجی (بازه را کوچک‌تر کنید) */
export const MAX_EXPORT_ROWS = 10_000;

const HEADERS = [
  "شماره سفارش",
  "تاریخ ثبت",
  "وضعیت",
  "موبایل مشتری",
  "نام مشتری",
  "گیرنده",
  "موبایل گیرنده",
  "شهر",
  "نشانی",
  "روش ارسال",
  "تعداد اقلام",
  "اقلام",
  "جمع کالاها",
  "هزینه ارسال",
  "تخفیف",
  "کد تخفیف",
  "مبلغ نهایی",
  "تاریخ پرداخت",
  "تاریخ ارسال",
  "کد رهگیری",
];

const EN = { digits: "en" } as const;

/** CSV سفارش‌ها با همان فیلترهای جدول؛ اعداد و تاریخ‌ها با ارقام لاتین */
export async function exportOrdersCsv(filters: OrderFilters): Promise<string> {
  const orders = await findOrdersForExport(filters, MAX_EXPORT_ROWS);
  const rows = orders.map((order) => {
    const address = parseAddressSnapshot(order.shippingAddressSnapshot);
    return [
      order.orderNumber,
      formatJalaliDateTime(order.placedAt, EN),
      ORDER_STATUS_LABELS[order.status],
      order.user.phone,
      order.user.fullName,
      address?.receiverName,
      address?.receiverPhone,
      address ? `${address.province} - ${address.city}` : null,
      // سفارش تحویل حضوری آدرس ندارد
      address ? address.line : PICKUP_LABEL,
      order.shippingMethodName,
      order._count.items,
      // «نام محصول · ترکیب × تعداد»؛ ترکیب‌ها (پرسی/بوتان، خالی/پرشده) جدا دیده می‌شوند
      order.items
        .map(
          (item) =>
            `${itemLabel(item.productName, item.variantTitle)} × ${item.quantity}`,
        )
        .join(" | "),
      order.subtotal,
      order.shippingTotal,
      order.discountTotal,
      order.couponCode,
      order.grandTotal,
      order.paidAt ? formatJalaliDateTime(order.paidAt, EN) : null,
      order.shippedAt ? formatJalaliDateTime(order.shippedAt, EN) : null,
      order.trackingCode,
    ];
  });
  return toCsv(HEADERS, rows);
}

export function exportFileName(now: Date = new Date()): string {
  return `orders-${formatJalali(now, "YYYY-MM-DD", EN)}.csv`;
}
