import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCoupon,
  createCustomer,
  fillCart,
  quote,
} from "@/test/order-fixtures";

import { createOrder } from "./order.service";
import { transitionOrderStatus } from "./order-status.service";

let catalog: Catalog;

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  await cleanupFixtures();
});

async function placeWithCoupon() {
  const customer = await createCustomer();
  const coupon = await createCoupon({
    type: "FIXED",
    value: 30_000,
    usageLimitTotal: 1,
  });
  await fillCart(customer, [[catalog.small, 1]], coupon.code);
  const placed = await createOrder(customer.owner, {
    addressId: customer.addressId,
    shippingMethodId: catalog.post.id,
    acceptServiceTerms: false,
    customerNote: null,
    expectedGrandTotal: await quote(customer, catalog.post),
  });
  return { customer, coupon, orderId: placed.orderId };
}

describe("transitionOrderStatus()", () => {
  it("انتقال غیرمجاز رد می‌شود و وضعیت عوض نمی‌شود", async () => {
    const { orderId } = await placeWithCoupon();
    await expect(
      transitionOrderStatus({ orderId, to: "SHIPPED", actorUserId: null }),
    ).rejects.toThrow("مجاز نیست");
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PENDING_PAYMENT");
  });

  it("زنجیره‌ی مجاز: هر انتقال یک ردیف تاریخچه و رویداد اعلان درست", async () => {
    const { orderId, customer } = await placeWithCoupon();
    const steps = [
      ["PAYMENT_REVIEW", ["ADMIN_RECEIPT_SUBMITTED"]],
      ["PAYMENT_REJECTED", ["PAYMENT_REJECTED"]],
      ["PAYMENT_REVIEW", ["ADMIN_RECEIPT_SUBMITTED"]],
      ["PROCESSING", ["PAYMENT_APPROVED"]],
      ["SHIPPED", ["ORDER_SHIPPED"]],
      ["DELIVERED", []],
    ] as const;
    for (const [to, notifications] of steps) {
      if (to === "PROCESSING") {
        // بدون پرداخت تأییدشده رد می‌شود؛ سرویس پرداخت paidAt را ثبت می‌کند
        await expect(
          transitionOrderStatus({ orderId, to, actorUserId: customer.userId }),
        ).rejects.toThrow("بدون پرداخت تأییدشده");
        await db.order.update({
          where: { id: orderId },
          data: { paidAt: new Date() },
        });
      }
      const result = await transitionOrderStatus({
        orderId,
        to,
        actorUserId: customer.userId,
      });
      expect(result.notifications).toEqual(notifications);
    }
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { statusHistory: { orderBy: { createdAt: "asc" } } },
    });
    expect(order.status).toBe("DELIVERED");
    expect(order.shippedAt).not.toBeNull();
    expect(order.statusHistory.map((h) => h.toStatus)).toEqual([
      "PENDING_PAYMENT",
      ...steps.map(([to]) => to),
    ]);
  });

  it("رد رسید کوپن را آزاد نمی‌کند؛ لغو آن را آزاد می‌کند", async () => {
    const { orderId, coupon } = await placeWithCoupon();
    const usage = async () => ({
      usedCount: (
        await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })
      ).usedCount,
      redemptions: await db.couponRedemption.count({
        where: { couponId: coupon.id },
      }),
    });
    expect(await usage()).toEqual({ usedCount: 1, redemptions: 1 });

    await transitionOrderStatus({
      orderId,
      to: "PAYMENT_REVIEW",
      actorUserId: null,
    });
    await transitionOrderStatus({
      orderId,
      to: "PAYMENT_REJECTED",
      actorUserId: null,
    });
    expect(await usage()).toEqual({ usedCount: 1, redemptions: 1 });

    await transitionOrderStatus({
      orderId,
      to: "CANCELED",
      actorUserId: null,
      note: "لغو تست",
    });
    expect(await usage()).toEqual({ usedCount: 0, redemptions: 0 });
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.canceledAt).not.toBeNull();
    // اسنپ‌شات کد روی سفارش لغوشده می‌ماند
    expect(order.couponCode).toBe(coupon.code);

    await expect(
      transitionOrderStatus({
        orderId,
        to: "PAYMENT_REVIEW",
        actorUserId: null,
      }),
    ).rejects.toThrow("مجاز نیست");
  });

  it("دو تغییر هم‌زمان از یک وضعیت ⇒ فقط یکی اعمال می‌شود", async () => {
    const { orderId } = await placeWithCoupon();
    const results = await Promise.allSettled([
      transitionOrderStatus({
        orderId,
        to: "PAYMENT_REVIEW",
        actorUserId: null,
      }),
      transitionOrderStatus({ orderId, to: "CANCELED", actorUserId: null }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const history = await db.orderStatusHistory.count({ where: { orderId } });
    expect(history).toBe(2);
  });
});
