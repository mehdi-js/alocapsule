import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TOTAL_LIMIT_MESSAGE } from "@/lib/coupon";
import { db } from "@/lib/db";
import {
  DEFAULT_ORDER_NUMBER_PREFIX,
  ORDER_NUMBER_PATTERN,
  ORDER_NUMBER_PREFIX_KEY,
} from "@/lib/order-number";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCoupon,
  createCustomer,
  fillCart,
  ordersOf,
  placeOrder,
  quote,
} from "@/test/order-fixtures";

import { PRICE_CHANGED_MESSAGE } from "./order.service";

/** برای تست «شکست در میانه»: ساخت پرداخت (مرحله‌ی ۶) به‌دلخواه خطا می‌دهد */
const failures = vi.hoisted(() => ({ payment: false }));
vi.mock("@/server/repositories/order.repository", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/repositories/order.repository")
    >();
  return {
    ...actual,
    createPendingPayment: (
      ...args: Parameters<typeof actual.createPendingPayment>
    ) => {
      if (failures.payment) throw new Error("simulated failure");
      return actual.createPendingPayment(...args);
    },
  };
});

let catalog: Catalog;

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  await cleanupFixtures();
});

describe("createOrder()", () => {
  it("ثبت کامل: اسنپ‌شات، فرمول مبلغ، پرداخت، تاریخچه و خالی شدن سبد", async () => {
    const customer = await createCustomer();
    const coupon = await createCoupon({ type: "PERCENT", value: 10 });
    await fillCart(
      customer,
      [
        [catalog.small, 2],
        [catalog.large, 1],
      ],
      coupon.code,
    );

    const placed = await placeOrder(customer, catalog.post, {
      customerNote: "تحویل عصر",
    });
    expect(placed.orderNumber).toMatch(ORDER_NUMBER_PATTERN);

    const [order] = await ordersOf(customer.userId);
    // ۲×۴۰۰٬۰۰۰ + ۷۵۰٬۰۰۰ = ۱٬۵۵۰٬۰۰۰؛ ۱۰٪ = ۱۵۵٬۰۰۰؛ پست ۹۰٬۰۰۰
    expect(order).toMatchObject({
      status: "PENDING_PAYMENT",
      subtotal: 1_550_000,
      discountTotal: 155_000,
      shippingTotal: 90_000,
      grandTotal: 1_485_000,
      couponCode: coupon.code,
      customerNote: "تحویل عصر",
    });
    expect(order!.grandTotal).toBe(
      order!.subtotal + order!.shippingTotal - order!.discountTotal,
    );
    expect(order!.items).toHaveLength(2);
    expect(
      order!.items.find((i) => i.variantId === catalog.small),
    ).toMatchObject({
      unitPrice: 400_000,
      quantity: 2,
      lineTotal: 800_000,
      unitValueSnapshot: 500,
      unitSnapshot: "GRAM",
    });
    expect(order!.payments).toMatchObject([
      { method: "CARD_TO_CARD", status: "PENDING", amount: 1_485_000 },
    ]);
    expect(order!.statusHistory).toMatchObject([
      { fromStatus: null, toStatus: "PENDING_PAYMENT" },
    ]);
    expect(order!.couponRedemptions).toMatchObject([
      { couponId: coupon.id, discountAmount: 155_000 },
    ]);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(1);

    const cart = await db.cart.findFirst({
      where: { userId: customer.userId },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(0);
    expect(cart?.couponCode).toBeNull();

    // تغییر بعدی قیمت، سفارش ثبت‌شده را تغییر نمی‌دهد
    await db.productVariant.update({
      where: { id: catalog.small },
      data: { price: 999_000 },
    });
    const [again] = await ordersOf(customer.userId);
    expect(
      again!.items.find((i) => i.variantId === catalog.small)?.unitPrice,
    ).toBe(400_000);
    await db.productVariant.update({
      where: { id: catalog.small },
      data: { price: 400_000 },
    });
  });

  it("🔴 استفاده‌ی هم‌زمان چند کاربر از کوپن با usageLimitTotal=1 ⇒ فقط یکی موفق", async () => {
    const coupon = await createCoupon({
      type: "FIXED",
      value: 50_000,
      usageLimitTotal: 1,
    });
    const customers = await Promise.all(
      Array.from({ length: 5 }, () => createCustomer()),
    );
    for (const customer of customers) {
      await fillCart(customer, [[catalog.small, 1]], coupon.code);
    }
    const totals = await Promise.all(
      customers.map((customer) => quote(customer, catalog.post)),
    );

    const results = await Promise.allSettled(
      customers.map((customer, index) =>
        placeOrder(customer, catalog.post, {
          expectedGrandTotal: totals[index],
        }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    for (const result of rejected) {
      expect((result.reason as Error).message).toBe(TOTAL_LIMIT_MESSAGE);
    }

    const fresh = await db.coupon.findUniqueOrThrow({
      where: { id: coupon.id },
    });
    expect(fresh.usedCount).toBe(1);
    expect(
      await db.couponRedemption.count({ where: { couponId: coupon.id } }),
    ).toBe(1);
    const orders = await db.order.count({
      where: { userId: { in: customers.map((c) => c.userId) } },
    });
    expect(orders).toBe(1);
  });

  it("شکست در میانه ⇒ هیچ سفارش، redemption یا پرداختی باقی نمی‌ماند", async () => {
    const customer = await createCustomer();
    const coupon = await createCoupon({ type: "FIXED", value: 20_000 });
    await fillCart(customer, [[catalog.small, 1]], coupon.code);

    failures.payment = true;
    try {
      await expect(placeOrder(customer, catalog.post)).rejects.toThrow(
        "simulated failure",
      );
    } finally {
      failures.payment = false;
    }

    expect(await ordersOf(customer.userId)).toHaveLength(0);
    expect(
      await db.couponRedemption.count({ where: { couponId: coupon.id } }),
    ).toBe(0);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(0);
    // سبد دست‌نخورده می‌ماند و ثبت دوباره موفق است
    const cart = await db.cart.findFirst({
      where: { userId: customer.userId },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(1);
    expect(cart?.couponCode).toBe(coupon.code);
    await expect(placeOrder(customer, catalog.post)).resolves.toMatchObject({
      grandTotal: 470_000,
    });
  });

  it("دوبار کلیک هم‌زمان روی «ثبت سفارش» ⇒ فقط یک سفارش", async () => {
    const customer = await createCustomer();
    await fillCart(customer, [[catalog.large, 2]]);
    const total = await quote(customer, catalog.post);

    const results = await Promise.allSettled([
      placeOrder(customer, catalog.post, { expectedGrandTotal: total }),
      placeOrder(customer, catalog.post, { expectedGrandTotal: total }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const orders = await ordersOf(customer.userId);
    expect(orders).toHaveLength(1);
    expect(orders[0]!.payments).toHaveLength(1);
  });

  it("متغیر غیرفعال ⇒ قلم حذف، اطلاع داده و سفارشی ثبت نمی‌شود", async () => {
    const customer = await createCustomer();
    await fillCart(customer, [
      [catalog.small, 1],
      [catalog.large, 1],
    ]);
    const total = await quote(customer, catalog.post);
    await db.productVariant.update({
      where: { id: catalog.large },
      data: { isActive: false },
    });
    try {
      await expect(
        placeOrder(customer, catalog.post, { expectedGrandTotal: total }),
      ).rejects.toThrow("دیگر قابل سفارش نیست و از سبد شما حذف شد");
    } finally {
      await db.productVariant.update({
        where: { id: catalog.large },
        data: { isActive: true },
      });
    }
    expect(await ordersOf(customer.userId)).toHaveLength(0);
    const items = await db.cartItem.findMany({
      where: { cart: { userId: customer.userId } },
    });
    expect(items.map((item) => item.variantId)).toEqual([catalog.small]);
  });

  it("تغییر قیمت پس از نمایش ⇒ ثبت نمی‌شود و مبلغ از سرور است", async () => {
    const customer = await createCustomer();
    await fillCart(customer, [[catalog.small, 1]]);
    await expect(
      placeOrder(customer, catalog.post, { expectedGrandTotal: 1 }),
    ).rejects.toThrow(PRICE_CHANGED_MESSAGE);
    expect(await ordersOf(customer.userId)).toHaveLength(0);
  });
  it("پیشوند شماره‌ی سفارش از Setting `order.numberPrefix` خوانده می‌شود", async () => {
    const previous = await db.setting.findUnique({
      where: { key: ORDER_NUMBER_PREFIX_KEY },
    });
    const setPrefix = (value: string | null) =>
      value === null
        ? db.setting.deleteMany({ where: { key: ORDER_NUMBER_PREFIX_KEY } })
        : db.setting.upsert({
            where: { key: ORDER_NUMBER_PREFIX_KEY },
            create: { key: ORDER_NUMBER_PREFIX_KEY, value },
            update: { value },
          });
    try {
      await setPrefix("ZZ");
      const custom = await createCustomer();
      await fillCart(custom, [[catalog.small, 1]]);
      const first = await placeOrder(custom, catalog.post);
      expect(first.orderNumber).toMatch(/^ZZ-\d{8}-\d{4,}$/);
      expect(first.orderNumber).toMatch(ORDER_NUMBER_PATTERN);

      // نامعتبر یا نبود ⇒ پیش‌فرض
      await setPrefix(null);
      await fillCart(custom, [[catalog.small, 1]]);
      const second = await placeOrder(custom, catalog.post);
      expect(
        second.orderNumber.startsWith(`${DEFAULT_ORDER_NUMBER_PREFIX}-`),
      ).toBe(true);
    } finally {
      if (previous) await setPrefix(previous.value as string);
      else await setPrefix(null);
    }
  });
});
