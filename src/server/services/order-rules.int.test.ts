import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { OUT_OF_AREA_MESSAGE } from "@/lib/service-area";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCoupon,
  createCustomer,
  fillCart,
  ordersOf,
  placeOrder,
} from "@/test/order-fixtures";

import { EMPTY_CART_MESSAGE } from "./order.service";

/** قواعد مبلغ، کد تخفیف، منطقه‌ی ارسال و شماره‌گذاری در ثبت سفارش */

let catalog: Catalog;

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  await cleanupFixtures();
});

describe("createOrder() — قواعد", () => {
  it("کد ارسال رایگان: تخفیف = هزینه‌ی ارسال", async () => {
    const customer = await createCustomer();
    const coupon = await createCoupon({ type: "FREE_SHIPPING", value: 0 });
    await fillCart(customer, [[catalog.small, 1]], coupon.code);
    await placeOrder(customer, catalog.courier);
    const [order] = await ordersOf(customer.userId);
    expect(order).toMatchObject({
      subtotal: 400_000,
      shippingTotal: 60_000,
      discountTotal: 60_000,
      grandTotal: 400_000,
    });
  });

  it("آستانه‌ی ارسال رایگان با مبلغ پس از تخفیف؛ کد بی‌اثر ثبت نمی‌شود", async () => {
    const customer = await createCustomer();
    // ۴×۷۵۰٬۰۰۰ = ۳٬۰۰۰٬۰۰۰ = آستانه؛ با ۱۰٪ تخفیف زیر آستانه می‌رود
    const percent = await createCoupon({ type: "PERCENT", value: 10 });
    await fillCart(customer, [[catalog.large, 4]], percent.code);
    await placeOrder(customer, catalog.post);
    const [withDiscount] = await ordersOf(customer.userId);
    expect(withDiscount).toMatchObject({
      discountTotal: 300_000,
      shippingTotal: 90_000,
      grandTotal: 2_790_000,
    });

    // ارسال خودش رایگان است ⇒ کد ارسال رایگان تخفیفی ندارد و مصرف نمی‌شود
    const free = await createCoupon({ type: "FREE_SHIPPING", value: 0 });
    await fillCart(customer, [[catalog.large, 4]], free.code);
    await placeOrder(customer, catalog.post);
    const orders = await ordersOf(customer.userId);
    const second = orders.find((o) => o.id !== withDiscount!.id);
    expect(second).toMatchObject({
      shippingTotal: 0,
      discountTotal: 0,
      couponCode: null,
    });
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: free.id } })).usedCount,
    ).toBe(0);
  });

  it("کد نامعتبر هنگام ثبت ⇒ سفارش ثبت نمی‌شود", async () => {
    const customer = await createCustomer();
    const coupon = await createCoupon({
      type: "FIXED",
      value: 10_000,
      minOrderAmount: 1_000_000,
    });
    await fillCart(customer, [[catalog.small, 1]], coupon.code);
    await expect(placeOrder(customer, catalog.post)).rejects.toThrow(
      "این کد برای خرید حداقل",
    );
    expect(await ordersOf(customer.userId)).toHaveLength(0);
  });

  it("خارج از منطقه‌ی ارسال، روش ارسال محدود و سبد خالی رد می‌شوند", async () => {
    const outside = await createCustomer({ province: "فارس", city: "شیراز" });
    await fillCart(outside, [[catalog.small, 1]]);
    await expect(placeOrder(outside, catalog.post)).rejects.toThrow(
      OUT_OF_AREA_MESSAGE,
    );

    const customer = await createCustomer();
    await expect(placeOrder(customer, catalog.post)).rejects.toThrow(
      EMPTY_CART_MESSAGE,
    );

    await db.shippingMethod.update({
      where: { id: catalog.courier.id },
      data: { provinces: ["البرز"] },
    });
    try {
      await fillCart(customer, [[catalog.small, 1]]);
      await expect(placeOrder(customer, catalog.courier)).rejects.toThrow(
        "ارسال ندارد",
      );
    } finally {
      await db.shippingMethod.update({
        where: { id: catalog.courier.id },
        data: { provinces: ["تهران"] },
      });
    }
  });

  it("شماره‌ی سفارش‌های یک روز پشت‌سرهم است", async () => {
    const customer = await createCustomer();
    await fillCart(customer, [[catalog.small, 1]]);
    const first = await placeOrder(customer, catalog.post);
    await fillCart(customer, [[catalog.small, 1]]);
    const second = await placeOrder(customer, catalog.post);
    const seq = (value: string) => Number(value.split("-")[2]);
    expect(seq(second.orderNumber)).toBe(seq(first.orderNumber) + 1);
  });
});
