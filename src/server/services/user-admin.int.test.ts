import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createSession, resolveSession } from "@/server/auth/session";
import { findLedgerMismatches } from "@/server/repositories/wallet.repository";
import {
  cleanupFixtures,
  createAdmin,
  createCustomer,
} from "@/test/order-fixtures";

import {
  adjustWalletByAdmin,
  listUsers,
  updateUserByAdmin,
} from "./user-admin.service";

afterAll(async () => {
  await cleanupFixtures();
});

const adjustment = (
  type: "CREDIT" | "DEBIT",
  amount: number,
  requestId: string = randomUUID(),
) => ({ type, amount, note: "تنظیم آزمایشی", requestId });

describe("مدیریت کاربران", () => {
  it("🔴 تغییر دستی کیف پول همیشه یک ردیف ledger + AuditLog می‌سازد", async () => {
    const adminId = await createAdmin();
    const { userId } = await createCustomer();

    await adjustWalletByAdmin(adminId, userId, adjustment("CREDIT", 300_000));
    await adjustWalletByAdmin(adminId, userId, adjustment("DEBIT", 120_000));
    await expect(
      adjustWalletByAdmin(adminId, userId, adjustment("DEBIT", 999_999)),
    ).rejects.toThrow("موجودی نمی‌تواند منفی شود");

    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { walletTransactions: { orderBy: { createdAt: "asc" } } },
    });
    expect(user.walletBalance).toBe(180_000);
    expect(
      user.walletTransactions.map((t) => [
        t.type,
        t.reason,
        t.amount,
        t.balanceAfter,
        t.createdByUserId,
        t.note,
      ]),
    ).toEqual([
      ["CREDIT", "ADMIN_CREDIT", 300_000, 300_000, adminId, "تنظیم آزمایشی"],
      ["DEBIT", "ADMIN_DEBIT", 120_000, 180_000, adminId, "تنظیم آزمایشی"],
    ]);
    const audits = await db.auditLog.findMany({
      where: { entityId: userId },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((a) => a.action)).toEqual([
      "wallet.admin_credit",
      "wallet.admin_debit",
    ]);
    expect(
      (await findLedgerMismatches()).find((m) => m.userId === userId),
    ).toBeUndefined();
  });

  it("کلیک دوباره (همان requestId، هم‌زمان) ⇒ فقط یک تراکنش", async () => {
    const adminId = await createAdmin();
    const { userId } = await createCustomer();
    const requestId = randomUUID();

    const outcomes = await Promise.all([
      adjustWalletByAdmin(
        adminId,
        userId,
        adjustment("CREDIT", 50_000, requestId),
      ),
      adjustWalletByAdmin(
        adminId,
        userId,
        adjustment("CREDIT", 50_000, requestId),
      ),
    ]);
    expect(outcomes.filter((o) => o.changed)).toHaveLength(1);
    expect(await db.walletTransaction.count({ where: { userId } })).toBe(1);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: userId } }))
        .walletBalance,
    ).toBe(50_000);
  });

  it("🔴 غیرفعال کردن کاربر نشست‌هایش را باطل می‌کند", async () => {
    const adminId = await createAdmin();
    const { userId } = await createCustomer();
    const first = await createSession({
      userId,
      role: "CUSTOMER",
      userAgent: "test",
      method: "OTP",
    });
    const second = await createSession({
      userId,
      role: "CUSTOMER",
      userAgent: "test",
      method: "OTP",
    });
    expect(await resolveSession(first.token)).not.toBeNull();

    await updateUserByAdmin(adminId, userId, {
      fullName: "کاربر تست",
      email: null,
      role: "CUSTOMER",
      isActive: false,
    });
    expect(await resolveSession(first.token)).toBeNull();
    expect(await resolveSession(second.token)).toBeNull();
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user).toMatchObject({ isActive: false, fullName: "کاربر تست" });
    expect(
      await db.auditLog.count({
        where: { entityId: userId, action: "user.updated" },
      }),
    ).toBe(1);

    // ویرایش نام بدون تغییر نقش/وضعیت نشست تازه را باطل نمی‌کند
    await updateUserByAdmin(adminId, userId, {
      fullName: "کاربر تست",
      email: null,
      role: "CUSTOMER",
      isActive: true,
    });
    const fresh = await createSession({
      userId,
      role: "CUSTOMER",
      userAgent: "test",
      method: "OTP",
    });
    await updateUserByAdmin(adminId, userId, {
      fullName: "نام تازه",
      email: "new@example.com",
      role: "CUSTOMER",
      isActive: true,
    });
    expect(await resolveSession(fresh.token)).not.toBeNull();
  });

  it("ادمین نقش یا وضعیت خودش را تغییر نمی‌دهد؛ تغییر نقش نشست‌ها را باطل می‌کند", async () => {
    const adminA = await createAdmin();
    const adminB = await createAdmin();
    const inactive = { fullName: null, email: null, isActive: false };

    await expect(
      updateUserByAdmin(adminA, adminA, {
        ...inactive,
        role: "ADMIN",
      }),
    ).rejects.toThrow("حساب خودتان");

    // ادمین B نقش مشتری می‌گیرد (ادمین‌های دیگر فعال‌اند) و نشستش باطل می‌شود
    const session = await createSession({
      userId: adminB,
      role: "ADMIN",
      userAgent: "test",
      method: "OTP",
    });
    await updateUserByAdmin(adminA, adminB, {
      fullName: null,
      email: null,
      role: "CUSTOMER",
      isActive: true,
    });
    expect(await resolveSession(session.token)).toBeNull();
  });

  it("🔴 دو ادمین هم‌زمان نقش هم را بردارند ⇒ یکی رد می‌شود (آخرین ادمین فعال می‌ماند)", async () => {
    const adminA = await createAdmin();
    const adminB = await createAdmin();
    // فقط A و B ادمین فعال باشند (بقیه موقتاً غیرفعال و در پایان برگردانده می‌شوند)
    const others = await db.user.findMany({
      where: { role: "ADMIN", isActive: true, id: { notIn: [adminA, adminB] } },
      select: { id: true },
    });
    await db.user.updateMany({
      where: { id: { in: others.map((u) => u.id) } },
      data: { isActive: false },
    });
    try {
      const demote = {
        fullName: null,
        email: null,
        role: "CUSTOMER" as const,
        isActive: true,
      };
      const results = await Promise.allSettled([
        updateUserByAdmin(adminA, adminB, demote),
        updateUserByAdmin(adminB, adminA, demote),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      expect((rejected?.reason as Error).message).toBe(
        "حداقل یک ادمین فعال باید باقی بماند.",
      );
      expect(
        await db.user.count({
          where: {
            id: { in: [adminA, adminB] },
            role: "ADMIN",
            isActive: true,
          },
        }),
      ).toBe(1);
    } finally {
      await db.user.updateMany({
        where: { id: { in: others.map((u) => u.id) } },
        data: { isActive: true },
      });
    }
  });

  it("جستجو با موبایل (ارقام فارسی) و نام", async () => {
    const { userId } = await createCustomer();
    const user = await db.user.update({
      where: { id: userId },
      data: { fullName: "نرگس جستجوپذیر" },
    });
    const persianDigits = user.phone.replace(/\d/g, (d) =>
      "۰۱۲۳۴۵۶۷۸۹".charAt(Number(d)),
    );
    expect((await listUsers(persianDigits)).rows.map((r) => r.id)).toEqual([
      userId,
    ]);
    expect((await listUsers("جستجوپذیر")).rows.map((r) => r.id)).toContain(
      userId,
    );
  });
});
