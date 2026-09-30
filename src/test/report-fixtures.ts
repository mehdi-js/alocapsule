import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";

/**
 * سفارش مستقیم با تاریخ و وضعیت دلخواه برای تست گزارش‌ها. کاربر باید با
 * `createCustomer()` ساخته شده باشد تا `cleanupFixtures()` سفارش را پاک کند.
 */

const RUN = randomBytes(3).toString("hex");

let reportOrderSeq = 0;

/** سفارش مستقیم با تاریخ و وضعیت دلخواه (برای تست گزارش‌ها) */
export async function createReportOrder(params: {
  userId: string;
  placedAt: Date;
  status: "PENDING_PAYMENT" | "PROCESSING" | "DELIVERED" | "CANCELED";
  paid: boolean;
  items: {
    variantId: string;
    name: string;
    title: string;
    price: number;
    quantity: number;
  }[];
  productId: string;
  shippingTotal: number;
  discountTotal: number;
  couponCode?: string | null;
}) {
  const items = params.items.map((item) => ({
    variantId: item.variantId,
    productId: params.productId,
    productName: item.name,
    variantTitle: item.title,
    unitPrice: item.price,
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
    unitValueSnapshot: 500,
    unitSnapshot: "GRAM" as const,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return db.order.create({
    data: {
      orderNumber: `TEST-${RUN}-${++reportOrderSeq}`,
      userId: params.userId,
      status: params.status,
      subtotal,
      shippingTotal: params.shippingTotal,
      discountTotal: params.discountTotal,
      grandTotal: subtotal + params.shippingTotal - params.discountTotal,
      couponCode: params.couponCode ?? null,
      shippingMethodName: "پست تست",
      shippingAddressSnapshot: {},
      placedAt: params.placedAt,
      paidAt: params.paid ? params.placedAt : null,
      items: { create: items },
    },
  });
}
