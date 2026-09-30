import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCoupon,
  createCustomer,
} from "@/test/order-fixtures";
import { createReportOrder } from "@/test/report-fixtures";

import { runFinanceAudit } from "./finance-audit.service";

let catalog: Catalog;

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  await cleanupFixtures();
});

describe("check:finance", () => {
  it("🔴 ناهمخوانی کوپن، فرمول مبلغ و پرداخت را پیدا می‌کند", async () => {
    const { userId } = await createCustomer();
    const coupon = await createCoupon({
      type: "FIXED",
      value: 10_000,
      usedCount: 3,
    });
    const item = {
      variantId: catalog.small,
      name: "محصول تست",
      title: "۵۰۰ گرم",
      price: 400_000,
      quantity: 1,
    };
    // پرداخت‌شده ولی بدون Payment تأییدشده
    const paid = await createReportOrder({
      userId,
      placedAt: new Date(),
      status: "PROCESSING",
      paid: true,
      productId: catalog.productId,
      items: [item],
      shippingTotal: 0,
      discountTotal: 0,
    });
    // فرمول مبلغ خراب
    const broken = await createReportOrder({
      userId,
      placedAt: new Date(),
      status: "PENDING_PAYMENT",
      paid: false,
      productId: catalog.productId,
      items: [item],
      shippingTotal: 90_000,
      discountTotal: 0,
    });
    await db.order.update({
      where: { id: broken.id },
      data: { grandTotal: 1 },
    });

    const report = await runFinanceAudit();
    expect(report.ok).toBe(false);
    expect(report.coupons).toContainEqual({
      code: coupon.code,
      usedCount: 3,
      redemptions: 0,
    });
    expect(report.orderTotals.map((o) => o.orderNumber)).toContain(
      broken.orderNumber,
    );
    expect(report.paidWithoutPayment.map((o) => o.orderNumber)).toContain(
      paid.orderNumber,
    );
    expect(report.orderTotals.map((o) => o.orderNumber)).not.toContain(
      paid.orderNumber,
    );
  });
});
