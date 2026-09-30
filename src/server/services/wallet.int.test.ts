import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { findLedgerMismatches } from "@/server/repositories/wallet.repository";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCustomer,
  creditWallet,
  fillCart,
  placeOrder,
} from "@/test/order-fixtures";

import { INSUFFICIENT_WALLET_MESSAGE, payWithWallet } from "./payment.service";

let catalog: Catalog;

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  await cleanupFixtures();
});

async function orderFor(balance: number) {
  const customer = await createCustomer();
  if (balance > 0) await creditWallet(customer.userId, balance);
  await fillCart(customer, [[catalog.small, 1]]);
  const placed = await placeOrder(customer, catalog.post);
  return { customer, ...placed };
}

describe("پرداخت از کیف پول", () => {
  it("🔴 کسر + ledger + تأیید فوری؛ دوبار کلیک هم‌زمان ⇒ فقط یک کسر", async () => {
    const { customer, orderId, orderNumber, grandTotal } =
      await orderFor(2_000_000);

    const results = await Promise.allSettled([
      payWithWallet({ userId: customer.userId, orderNumber }),
      payWithWallet({ userId: customer.userId, orderNumber }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const user = await db.user.findUniqueOrThrow({
      where: { id: customer.userId },
      include: { walletTransactions: { orderBy: { createdAt: "asc" } } },
    });
    expect(user.walletBalance).toBe(2_000_000 - grandTotal);
    expect(user.walletTransactions.map((t) => [t.type, t.reason])).toEqual([
      ["CREDIT", "ADMIN_CREDIT"],
      ["DEBIT", "ORDER_PAYMENT"],
    ]);
    expect(user.walletTransactions[1]).toMatchObject({
      amount: grandTotal,
      balanceAfter: 2_000_000 - grandTotal,
      orderId,
    });

    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true, statusHistory: true },
    });
    expect(order.status).toBe("PROCESSING");
    expect(order.paidAt).not.toBeNull();
    // پرداخت در انتظارِ ثبت سفارش به پرداخت کیف پولِ تأییدشده تبدیل می‌شود
    expect(order.payments).toMatchObject([
      { method: "WALLET", status: "APPROVED", amount: grandTotal },
    ]);
    expect(order.statusHistory.map((h) => h.toStatus)).toEqual([
      "PENDING_PAYMENT",
      "PROCESSING",
    ]);
    expect(
      await db.auditLog.count({
        where: { actorUserId: customer.userId, action: "payment.wallet_paid" },
      }),
    ).toBe(1);
  });

  it("موجودی ناکافی ⇒ هیچ تغییری", async () => {
    const { customer, orderId, orderNumber } = await orderFor(100_000);
    await expect(
      payWithWallet({ userId: customer.userId, orderNumber }),
    ).rejects.toThrow(INSUFFICIENT_WALLET_MESSAGE);

    const user = await db.user.findUniqueOrThrow({
      where: { id: customer.userId },
    });
    expect(user.walletBalance).toBe(100_000);
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true },
    });
    expect(order).toMatchObject({ status: "PENDING_PAYMENT", paidAt: null });
    expect(order.payments).toMatchObject([
      { method: "CARD_TO_CARD", status: "PENDING" },
    ]);
  });

  it("🔴 بررسی ledger: جمع تراکنش‌ها = موجودی؛ ناهمخوانی شناسایی می‌شود", async () => {
    const { customer } = await orderFor(500_000);
    const mine = async () =>
      (await findLedgerMismatches()).filter(
        (m) => m.userId === customer.userId,
      );
    expect(await mine()).toEqual([]);

    // دستکاری مستقیم موجودی بدون ledger (همان خطایی که نباید رخ دهد)
    await db.user.update({
      where: { id: customer.userId },
      data: { walletBalance: 999 },
    });
    expect(await mine()).toMatchObject([
      { walletBalance: 999, ledgerBalance: 500_000, lastBalanceAfter: 500_000 },
    ]);
    await db.user.update({
      where: { id: customer.userId },
      data: { walletBalance: 500_000 },
    });
  });
});
