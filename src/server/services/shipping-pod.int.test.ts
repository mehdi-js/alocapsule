import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCustomer,
  fillCart,
  placeOrder,
} from "@/test/order-fixtures";

/** روش ارسال «پرداخت درب منزل»: در سایت هزینه‌ی ارسال صفر، ولی «رایگان» نیست */

let catalog: Catalog;
let methodId: string;

beforeAll(async () => {
  catalog = await createCatalog();
  const method = await db.shippingMethod.create({
    data: {
      name: "ارسال با پیک (تست)",
      cost: 0,
      payOnDelivery: true,
      isActive: false,
    },
  });
  methodId = method.id;
});

afterAll(async () => {
  await cleanupFixtures();
  await db.shippingMethod.delete({ where: { id: methodId } });
});

describe("ارسال با پیک، پرداخت درب منزل", () => {
  it("هزینه‌ی ارسال سفارش صفر است و پرچم پرداخت درب منزل ثبت می‌شود", async () => {
    await db.shippingMethod.update({
      where: { id: methodId },
      data: { isActive: true },
    });
    try {
      const customer = await createCustomer();
      await fillCart(customer, [[catalog.small, 1]]);
      const { orderId } = await placeOrder(customer, {
        id: methodId,
        cost: 0,
        freeAboveAmount: null,
      });
      const order = await db.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(order).toMatchObject({
        shippingTotal: 0,
        shippingPayOnDelivery: true,
        shippingMethodName: "ارسال با پیک (تست)",
      });
      expect(order.grandTotal).toBe(order.subtotal - order.discountTotal);
    } finally {
      await db.shippingMethod.update({
        where: { id: methodId },
        data: { isActive: false },
      });
    }
  });
});
