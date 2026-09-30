import { db } from "@/lib/db";

/** بررسی‌های سلامت مالی — همه در SQL (بدون تغییر داده) */

export interface CouponUsageMismatch {
  code: string;
  usedCount: number;
  redemptions: number;
}

/** `usedCount` هر کد باید برابر تعداد redemptionهایش باشد */
export function findCouponUsageMismatches(): Promise<CouponUsageMismatch[]> {
  return db.$queryRaw<CouponUsageMismatch[]>`
    SELECT c."code", c."usedCount", COUNT(r."id")::int AS redemptions
    FROM "Coupon" c
    LEFT JOIN "CouponRedemption" r ON r."couponId" = c."id"
    GROUP BY c."id"
    HAVING c."usedCount" <> COUNT(r."id")
    ORDER BY c."code"
  `;
}

export interface OrderTotalMismatch {
  orderNumber: string;
  subtotal: number;
  itemsTotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
}

/** فرمول واحد: grandTotal = subtotal + shipping − discount و subtotal = جمع اقلام */
export function findOrderTotalMismatches(): Promise<OrderTotalMismatch[]> {
  return db.$queryRaw<OrderTotalMismatch[]>`
    SELECT o."orderNumber", o."subtotal",
           COALESCE(SUM(oi."lineTotal"), 0)::int AS "itemsTotal",
           o."shippingTotal", o."discountTotal", o."grandTotal"
    FROM "Order" o
    LEFT JOIN "OrderItem" oi ON oi."orderId" = o."id"
    GROUP BY o."id"
    HAVING o."grandTotal" <> o."subtotal" + o."shippingTotal" - o."discountTotal"
        OR o."subtotal" <> COALESCE(SUM(oi."lineTotal"), 0)
        OR o."discountTotal" < 0
        OR o."discountTotal" > o."subtotal" + o."shippingTotal"
    ORDER BY o."orderNumber"
  `;
}

/** سفارش پرداخت‌شده (`paidAt`) باید یک پرداخت تأییدشده به همان مبلغ داشته باشد */
export function findPaidOrdersWithoutPayment(): Promise<
  { orderNumber: string; grandTotal: number }[]
> {
  return db.$queryRaw<{ orderNumber: string; grandTotal: number }[]>`
    SELECT o."orderNumber", o."grandTotal"
    FROM "Order" o
    WHERE o."paidAt" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Payment" p
        WHERE p."orderId" = o."id" AND p."status" = 'APPROVED'
          AND p."amount" = o."grandTotal"
      )
    ORDER BY o."orderNumber"
  `;
}
