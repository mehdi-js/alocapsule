import { readdir } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { privateStorageDir } from "@/lib/storage/private";
import { findLedgerMismatches } from "@/server/repositories/wallet.repository";
import {
  type Catalog,
  cleanupFixtures,
  createAdmin,
  createCatalog,
  createCoupon,
  createCustomer,
  creditWallet,
  fillCart,
  placeOrder,
  receiptPng,
} from "@/test/order-fixtures";

import { deleteOrder, deletePayment } from "./order-delete.service";
import { payWithWallet, submitReceipt } from "./payment.service";
import { approvePayment, rejectPayment } from "./payment-review.service";

/** حذف سفارش/پرداخت: یکپارچگی کد تخفیف، کیف پول، شماره و فایل رسید */

let catalog: Catalog;
let adminId: string;

beforeAll(async () => {
  catalog = await createCatalog();
  adminId = await createAdmin();
});

afterAll(async () => {
  await db.auditLog.deleteMany({
    where: {
      action: { in: ["order.deleted", "payment.deleted"] },
      actorUserId: adminId,
    },
  });
  await cleanupFixtures();
});

async function newOrder(couponCode: string | null = null) {
  const customer = await createCustomer();
  await fillCart(customer, [[catalog.small, 1]], couponCode);
  const placed = await placeOrder(customer, catalog.post);
  return { customer, ...placed };
}

async function receiptCount(): Promise<number> {
  try {
    return (await readdir(path.join(privateStorageDir(), "receipts"))).length;
  } catch {
    return 0;
  }
}

describe("حذف سفارش", () => {
  it("با کد تخفیف و رسید: همه‌چیز حذف، usedCount کم، فایل رسید پاک، لاگ ممیزی می‌ماند", async () => {
    const coupon = await createCoupon({ type: "PERCENT", value: 10 });
    const { customer, orderId, orderNumber } = await newOrder(coupon.code);
    await submitReceipt({
      userId: customer.userId,
      orderNumber,
      file: await receiptPng(),
    });
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(1);
    const filesBefore = await receiptCount();

    await expect(deleteOrder(adminId, orderId, "AC-WRONG")).rejects.toThrow(
      "یکی نیست",
    );
    await deleteOrder(adminId, orderId, orderNumber);

    expect(await db.order.findUnique({ where: { id: orderId } })).toBeNull();
    expect(await db.payment.count({ where: { orderId } })).toBe(0);
    expect(await db.couponRedemption.count({ where: { orderId } })).toBe(0);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(0);
    expect(await receiptCount()).toBe(filesBefore - 1);
    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "order.deleted", entityId: orderId },
    });
    expect(audit.metadata).toMatchObject({ orderNumber });
  });

  it("پرداخت با کیف پول: تراکنش‌های کیف پول می‌مانند و ledger سالم است", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    await creditWallet(customer.userId, 2_000_000);
    await payWithWallet({ userId: customer.userId, orderNumber });

    await deleteOrder(adminId, orderId, orderNumber);
    const txs = await db.walletTransaction.findMany({
      where: { userId: customer.userId },
    });
    expect(txs).toHaveLength(2);
    expect(txs.every((tx) => tx.orderId === null)).toBe(true);
    const mismatches = await findLedgerMismatches();
    expect(
      mismatches.find((m) => m.userId === customer.userId),
    ).toBeUndefined();
  });

  it("شماره‌ی سفارش حذف‌شده دوباره استفاده نمی‌شود", async () => {
    const first = await newOrder();
    await deleteOrder(adminId, first.orderId, first.orderNumber);
    const second = await newOrder();
    expect(second.orderNumber).not.toBe(first.orderNumber);
    const seq = (n: string) => Number(n.split("-").pop());
    expect(seq(second.orderNumber)).toBeGreaterThan(seq(first.orderNumber));
  });
});

describe("حذف پرداخت", () => {
  it("فقط ردشده/بی‌استفاده؛ تأییدشده یا در حال بررسی رد می‌شود", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    await submitReceipt({
      userId: customer.userId,
      orderNumber,
      file: await receiptPng(),
    });
    const submitted = await db.payment.findFirstOrThrow({
      where: { orderId, status: "SUBMITTED" },
    });
    await expect(deletePayment(adminId, submitted.id)).rejects.toThrow(
      "در انتظار بررسی",
    );

    await rejectPayment(adminId, submitted.id, "رسید ناخوانا است");
    await deletePayment(adminId, submitted.id);
    expect(
      await db.payment.findUnique({ where: { id: submitted.id } }),
    ).toBeNull();
    expect(
      await db.order.findUnique({ where: { id: orderId } }),
    ).not.toBeNull();

    await submitReceipt({
      userId: customer.userId,
      orderNumber,
      file: await receiptPng(),
    });
    const second = await db.payment.findFirstOrThrow({
      where: { orderId, status: "SUBMITTED" },
    });
    await approvePayment(adminId, second.id);
    await expect(deletePayment(adminId, second.id)).rejects.toThrow(
      "خود سفارش را حذف کنید",
    );
  });
});
