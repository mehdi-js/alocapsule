import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  type Catalog,
  cleanupFixtures,
  createAdmin,
  createCatalog,
  createCoupon,
  createCustomer,
  fillCart,
  placeOrder,
  receiptPng,
} from "@/test/order-fixtures";

import { expireStaleOrders, EXPIRY_NOTE } from "./order-expiry.service";
import { submitReceipt } from "./payment.service";
import { rejectPayment } from "./payment-review.service";

/**
 * زمان سفارش‌ها به ژوئن ۲۰۱۱ منتقل می‌شود و job با «اکنونِ» همان زمان اجرا
 * می‌شود تا هیچ سفارش واقعی پایگاه داده‌ی توسعه لمس نشود.
 */
const BASE = new Date("2011-06-01T00:00:00Z");
const at = (hours: number) => new Date(BASE.getTime() + hours * 3_600_000);
const NOW = at(100); // مرز انقضا: ساعت ۲۸

let catalog: Catalog;
let adminId: string;

beforeAll(async () => {
  catalog = await createCatalog();
  adminId = await createAdmin();
});

afterAll(async () => {
  await cleanupFixtures();
});

async function order(couponCode: string | null = null) {
  const customer = await createCustomer();
  await fillCart(customer, [[catalog.small, 1]], couponCode);
  const placed = await placeOrder(customer, catalog.post);
  return { customer, ...placed };
}

/** زمان ثبت و هر ردیف تاریخچه (به تفکیک وضعیت مقصد) را جابه‌جا می‌کند */
async function backdate(
  orderId: string,
  placedAt: Date,
  history: Partial<Record<string, Date>>,
) {
  await db.order.update({ where: { id: orderId }, data: { placedAt } });
  for (const [toStatus, createdAt] of Object.entries(history)) {
    await db.orderStatusHistory.updateMany({
      where: { orderId, toStatus: toStatus as never },
      data: { createdAt },
    });
  }
}

async function rejected(receiptAt: Date, rejectedAt: Date) {
  const placed = await order();
  await submitReceipt({
    userId: placed.customer.userId,
    orderNumber: placed.orderNumber,
    file: await receiptPng(),
  });
  const payment = await db.payment.findFirstOrThrow({
    where: { orderId: placed.orderId, status: "SUBMITTED" },
  });
  await rejectPayment(adminId, payment.id, "رسید ناخوانا");
  await backdate(placed.orderId, at(0), {
    PENDING_PAYMENT: at(0),
    PAYMENT_REVIEW: receiptAt,
    PAYMENT_REJECTED: rejectedAt,
  });
  return placed;
}

const statusOf = async (orderId: string) =>
  (await db.order.findUniqueOrThrow({ where: { id: orderId } })).status;

describe("job:expire-orders", () => {
  it("🔴 ۷۲ ساعت بدون پرداخت ⇒ لغو + آزادسازی کوپن؛ بقیه دست‌نخورده", async () => {
    const coupon = await createCoupon({
      type: "FIXED",
      value: 10_000,
      usageLimitTotal: 5,
    });
    const stalePending = await order(coupon.code);
    await backdate(stalePending.orderId, at(0), { PENDING_PAYMENT: at(0) });

    const freshPending = await order();
    await backdate(freshPending.orderId, at(90), { PENDING_PAYMENT: at(90) });

    const staleRejected = await rejected(at(1), at(2));
    // ثبت خیلی قدیمی، ولی رد رسید فقط ۲۰ ساعت پیش ⇒ هنوز مهلت دارد
    const freshRejected = await rejected(at(1), at(80));

    const review = await order();
    await submitReceipt({
      userId: review.customer.userId,
      orderNumber: review.orderNumber,
      file: await receiptPng(),
    });
    await backdate(review.orderId, at(0), {
      PENDING_PAYMENT: at(0),
      PAYMENT_REVIEW: at(1),
    });

    const summary = await expireStaleOrders(NOW);
    expect(summary).toEqual({ expired: 2, failed: 0 });

    expect(await statusOf(stalePending.orderId)).toBe("CANCELED");
    expect(await statusOf(staleRejected.orderId)).toBe("CANCELED");
    expect(await statusOf(freshPending.orderId)).toBe("PENDING_PAYMENT");
    expect(await statusOf(freshRejected.orderId)).toBe("PAYMENT_REJECTED");
    expect(await statusOf(review.orderId)).toBe("PAYMENT_REVIEW");

    const history = await db.orderStatusHistory.findFirstOrThrow({
      where: { orderId: stalePending.orderId, toStatus: "CANCELED" },
    });
    expect(history).toMatchObject({ note: EXPIRY_NOTE, changedByUserId: null });
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(0);

    // اجرای دوباره اثری ندارد
    expect(await expireStaleOrders(NOW)).toEqual({ expired: 0, failed: 0 });
  });
});
