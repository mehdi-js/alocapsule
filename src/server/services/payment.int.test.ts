import { readdir } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { privateStorageDir } from "@/lib/storage/private";
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
import { getReceiptImage } from "./payment-page.service";
import { approvePayment, rejectPayment } from "./payment-review.service";

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

async function receiptFileCount(): Promise<number> {
  try {
    return (await readdir(path.join(privateStorageDir(), "receipts"))).length;
  } catch {
    return 0;
  }
}

describe("پرداخت کارت به کارت", () => {
  it("چرخه‌ی کامل: رسید ← بررسی ← تأیید ادمین ⇒ PROCESSING", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    await sendReceipt(customer, orderNumber);

    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true },
    });
    expect(order.status).toBe("PAYMENT_REVIEW");
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0]).toMatchObject({
      status: "SUBMITTED",
      method: "CARD_TO_CARD",
      // فرم رسید فقط تصویر دارد
      referenceNumber: null,
      payerCardLast4: null,
      paidAtClaimed: null,
    });
    expect(order.payments[0]!.receiptImageUrl).toMatch(
      /^receipts\/[0-9a-f-]{36}\.webp$/,
    );

    const paymentId = order.payments[0]!.id;
    const outcome = await approvePayment(adminId, paymentId);
    expect(outcome.changed).toBe(true);

    const approved = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true },
    });
    expect(approved.status).toBe("PROCESSING");
    expect(approved.paidAt).not.toBeNull();
    expect(approved.payments[0]).toMatchObject({
      status: "APPROVED",
      reviewedByUserId: adminId,
    });
    const actions = await db.auditLog.findMany({
      where: { entityId: paymentId },
      orderBy: { createdAt: "asc" },
    });
    expect(actions.map((a) => a.action)).toEqual([
      "payment.receipt_submitted",
      "payment.approved",
    ]);
  });

  it("🔴 دوبار کلیک هم‌زمان روی «تأیید» ⇒ فقط یک اثر", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    await sendReceipt(customer, orderNumber);
    const paymentId = await submittedPaymentId(orderId);

    const outcomes = await Promise.all([
      approvePayment(adminId, paymentId),
      approvePayment(adminId, paymentId),
      approvePayment(adminId, paymentId),
    ]);
    expect(outcomes.filter((o) => o.changed)).toHaveLength(1);
    expect(outcomes.filter((o) => !o.changed)[0]?.message).toBe(
      "این پرداخت قبلاً تأیید شده است.",
    );

    expect(
      await db.orderStatusHistory.count({
        where: { orderId, toStatus: "PROCESSING" },
      }),
    ).toBe(1);
    expect(
      await db.auditLog.count({
        where: { entityId: paymentId, action: "payment.approved" },
      }),
    ).toBe(1);
    // تأیید و رد هم‌زمان نیز فقط یکی را اعمال می‌کند
    expect(
      (await rejectPayment(adminId, paymentId, "دیرتر رسید")).changed,
    ).toBe(false);
  });

  it("رد رسید ⇒ رسید جدید ممکن است و کوپن آزاد نمی‌شود", async () => {
    const coupon = await createCoupon({ type: "FIXED", value: 10_000 });
    const { customer, orderId, orderNumber } = await newOrder(coupon.code);
    await sendReceipt(customer, orderNumber);
    const first = await submittedPaymentId(orderId);

    const rejected = await rejectPayment(
      adminId,
      first,
      "مبلغ واریزی کمتر است",
    );
    expect(rejected.changed).toBe(true);
    expect((await rejectPayment(adminId, first, "دوباره")).changed).toBe(false);

    const afterReject = await db.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(afterReject.status).toBe("PAYMENT_REJECTED");
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(1);
    expect(
      await db.couponRedemption.count({ where: { couponId: coupon.id } }),
    ).toBe(1);

    await sendReceipt(customer, orderNumber);
    const payments = await db.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
    expect(payments.map((p) => p.status)).toEqual(["REJECTED", "SUBMITTED"]);
    expect(payments[0]!.rejectReason).toBe("مبلغ واریزی کمتر است");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: orderId } })).status,
    ).toBe("PAYMENT_REVIEW");
  });

  it("رسید نامعتبر یا تکراری ⇒ خطا، بدون فایل باقی‌مانده", async () => {
    const { customer, orderNumber } = await newOrder();
    const before = await receiptFileCount();

    await expect(
      sendReceipt(customer, orderNumber, Buffer.from("not an image")),
    ).rejects.toThrow("تصویر معتبر نیست");

    const other = await createCustomer();
    await expect(sendReceipt(other, orderNumber)).rejects.toThrow(
      "سفارش پیدا نشد",
    );

    // دو ارسال هم‌زمان ⇒ فقط یکی ثبت می‌شود و فایل دیگری پاک می‌شود
    const results = await Promise.allSettled([
      sendReceipt(customer, orderNumber),
      sendReceipt(customer, orderNumber),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await receiptFileCount()).toBe(before + 1);
    await expect(sendReceipt(customer, orderNumber)).rejects.toThrow(
      "در حال بررسی",
    );
  });

  it("🔴 کاربر A رسید کاربر B را نمی‌بیند؛ ادمین می‌بیند", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    await sendReceipt(customer, orderNumber);
    const paymentId = await submittedPaymentId(orderId);
    const intruder = await createCustomer();

    expect(
      await getReceiptImage(paymentId, {
        id: customer.userId,
        role: "CUSTOMER",
      }),
    ).toBeInstanceOf(Buffer);
    expect(
      await getReceiptImage(paymentId, {
        id: intruder.userId,
        role: "CUSTOMER",
      }),
    ).toBeNull();
    expect(
      await getReceiptImage(paymentId, { id: adminId, role: "ADMIN" }),
    ).toBeInstanceOf(Buffer);
  });
});
