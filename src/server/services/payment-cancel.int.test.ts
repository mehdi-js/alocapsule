import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { findLedgerMismatches } from "@/server/repositories/wallet.repository";
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

import { submitReceipt } from "./payment.service";
import { approvePayment, cancelOrderByAdmin } from "./payment-review.service";

let catalog: Catalog;
let adminId: string;
let png: Buffer;

beforeAll(async () => {
  catalog = await createCatalog();
  adminId = await createAdmin();
  png = await receiptPng();
});

afterAll(async () => {
  await cleanupFixtures();
});

async function newOrder(couponCode: string | null = null) {
  const customer = await createCustomer();
  await fillCart(customer, [[catalog.small, 1]], couponCode);
  const placed = await placeOrder(customer, catalog.post);
  return { customer, ...placed };
}

function sendReceipt(customer: Customer, orderNumber: string, file = png) {
  return submitReceipt({
    userId: customer.userId,
    orderNumber,
    file,
  });
}

async function submittedPaymentId(orderId: string): Promise<string> {
  const payment = await db.payment.findFirstOrThrow({
    where: { orderId, status: "SUBMITTED" },
  });
  return payment.id;
}

describe("لغو توسط ادمین", () => {
  it("لغو سفارش پرداخت‌شده ⇒ بازگشت کامل وجه به کیف پول + آزادسازی کوپن", async () => {
    const coupon = await createCoupon({ type: "FIXED", value: 10_000 });
    const { customer, orderId, orderNumber, grandTotal } = await newOrder(
      coupon.code,
    );
    await sendReceipt(customer, orderNumber);
    await approvePayment(adminId, await submittedPaymentId(orderId));

    const outcome = await cancelOrderByAdmin(
      adminId,
      orderId,
      "مشتری انصراف داد",
    );
    expect(outcome).toMatchObject({ changed: true });
    expect((await cancelOrderByAdmin(adminId, orderId, "دوباره")).changed).toBe(
      false,
    );

    const user = await db.user.findUniqueOrThrow({
      where: { id: customer.userId },
      include: { walletTransactions: true },
    });
    expect(user.walletBalance).toBe(grandTotal);
    expect(user.walletTransactions).toMatchObject([
      {
        type: "CREDIT",
        reason: "ORDER_REFUND",
        amount: grandTotal,
        balanceAfter: grandTotal,
        orderId,
        createdByUserId: adminId,
      },
    ]);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(0);
    expect(
      await db.auditLog.count({
        where: { entityId: orderId, action: "order.refunded_to_wallet" },
      }),
    ).toBe(1);
    const mismatches = await findLedgerMismatches();
    expect(
      mismatches.find((m) => m.userId === customer.userId),
    ).toBeUndefined();
  });

  it("سفارشِ در بررسی قابل لغو نیست؛ پرداخت‌نشده بدون بازگشت وجه لغو می‌شود", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    await sendReceipt(customer, orderNumber);
    await expect(
      cancelOrderByAdmin(adminId, orderId, "لغو آزمایشی"),
    ).rejects.toThrow("ابتدا آن را تأیید یا رد کنید");

    const unpaid = await newOrder();
    const outcome = await cancelOrderByAdmin(
      adminId,
      unpaid.orderId,
      "لغو آزمایشی",
    );
    expect(outcome.message).toBe("سفارش لغو شد.");
    expect(
      await db.walletTransaction.count({ where: { orderId: unpaid.orderId } }),
    ).toBe(0);
  });
});
