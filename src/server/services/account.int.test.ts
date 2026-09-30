import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  type Catalog,
  cleanupFixtures,
  createAdmin,
  createCatalog,
  createCoupon,
  createCustomer,
  type Customer,
  fillCart,
  placeOrder,
  receiptPng,
} from "@/test/order-fixtures";

import {
  cancelMyOrder,
  getMyOrder,
  getMyWallet,
  listMyOrders,
} from "./account.service";
import { submitReceipt } from "./payment.service";
import { getPaymentPage } from "./payment-page.service";
import { rejectPayment } from "./payment-review.service";

let catalog: Catalog;
let adminId: string;

beforeAll(async () => {
  catalog = await createCatalog();
  adminId = await createAdmin();
});

afterAll(async () => {
  await cleanupFixtures();
});

async function orderFor(customer: Customer, couponCode: string | null = null) {
  await fillCart(customer, [[catalog.small, 1]], couponCode);
  return placeOrder(customer, catalog.post);
}

async function sendReceipt(customer: Customer, orderNumber: string) {
  await submitReceipt({
    userId: customer.userId,
    orderNumber,
    file: await receiptPng(),
  });
}

describe("پنل کاربر", () => {
  it("🔴 کاربر فقط سفارش‌های خودش را می‌بیند", async () => {
    const alice = await createCustomer();
    const bob = await createCustomer();
    const aliceOrder = await orderFor(alice);
    const bobOrder = await orderFor(bob);

    const aliceList = await listMyOrders(alice.userId);
    expect(aliceList.map((o) => o.orderNumber)).toEqual([
      aliceOrder.orderNumber,
    ]);

    expect(
      await getMyOrder(aliceOrder.orderNumber, alice.userId),
    ).toMatchObject({ orderNumber: aliceOrder.orderNumber, canCancel: true });
    // سفارش دیگری: مثل سفارش ناموجود
    expect(await getMyOrder(bobOrder.orderNumber, alice.userId)).toBeNull();
    expect(await getPaymentPage(bobOrder.orderNumber, alice.userId)).toBeNull();
    await expect(
      cancelMyOrder(alice.userId, bobOrder.orderNumber),
    ).rejects.toThrow("سفارش پیدا نشد");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: bobOrder.orderId } }))
        .status,
    ).toBe("PENDING_PAYMENT");

    const bobWallet = await getMyWallet(bob.userId);
    expect(bobWallet.transactions).toEqual([]);
  });

  it("🔴 لغو سفارش توسط کاربر کد تخفیف را آزاد می‌کند", async () => {
    const customer = await createCustomer();
    const coupon = await createCoupon({
      type: "FIXED",
      value: 10_000,
      usageLimitTotal: 1,
    });
    const { orderId, orderNumber } = await orderFor(customer, coupon.code);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(1);

    await cancelMyOrder(customer.userId, orderNumber);
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { statusHistory: { orderBy: { createdAt: "asc" } } },
    });
    expect(order.status).toBe("CANCELED");
    expect(order.statusHistory.at(-1)).toMatchObject({
      toStatus: "CANCELED",
      changedByUserId: customer.userId,
    });
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(0);
    expect(
      await db.couponRedemption.count({ where: { couponId: coupon.id } }),
    ).toBe(0);
    // لغو دوباره خطا نمی‌دهد و اثری ندارد
    await expect(
      cancelMyOrder(customer.userId, orderNumber),
    ).resolves.toBeUndefined();
    // کد آزادشده دوباره قابل استفاده است
    await expect(orderFor(customer, coupon.code)).resolves.toBeDefined();
  });

  it("رسید ردشده قابل لغو است؛ رسیدِ در بررسی نه", async () => {
    const customer = await createCustomer();
    const { orderId, orderNumber } = await orderFor(customer);
    await sendReceipt(customer, orderNumber);

    expect(await getMyOrder(orderNumber, customer.userId)).toMatchObject({
      status: "PAYMENT_REVIEW",
      canCancel: false,
      canPay: false,
    });
    await expect(cancelMyOrder(customer.userId, orderNumber)).rejects.toThrow(
      "در حال بررسی",
    );

    const payment = await db.payment.findFirstOrThrow({
      where: { orderId, status: "SUBMITTED" },
    });
    await rejectPayment(adminId, payment.id, "رسید ناخوانا است");
    expect(await getMyOrder(orderNumber, customer.userId)).toMatchObject({
      status: "PAYMENT_REJECTED",
      canCancel: true,
      lastPayment: { status: "REJECTED", rejectReason: "رسید ناخوانا است" },
    });
    await cancelMyOrder(customer.userId, orderNumber);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: orderId } })).status,
    ).toBe("CANCELED");
  });
});
