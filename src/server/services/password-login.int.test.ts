import { randomInt } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { SmsProvider } from "@/lib/sms";
import { hashPassword } from "@/server/auth/password-hash";
import { resolveSession } from "@/server/auth/session";

import {
  loginWithOtp,
  loginWithPassword,
  PASSWORD_FAILURE_RULES,
  startLogin,
} from "./auth.service";
import {
  currentPasswordRequired,
  OTP_RESET_WINDOW_MS,
  resetPasswordByPhone,
  setOwnPassword,
} from "./password.service";

/** ورود با رمز عبور + تعیین رمز (ثبت‌نام اجباری، فراموشی، تغییر) */

const phones = new Set<string>();
const IP = `10.99.${randomInt(0, 255)}.${randomInt(1, 255)}`;
const PASSWORD = "Alihan1405";

function newPhone(): string {
  const phone = `0998${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
  phones.add(phone);
  return phone;
}

/** provider آزمایشی که آخرین کد ارسالی را نگه می‌دارد */
function captureSms() {
  const sent: { to: string; code: string }[] = [];
  const provider: SmsProvider = {
    name: "console",
    async sendPattern({ to, args }) {
      sent.push({ to, code: args[0] ?? "" });
      return { ok: true, providerMessageId: "test" };
    },
  };
  return { provider, sent };
}

async function userWithPassword(password = PASSWORD) {
  const phone = newPhone();
  return db.user.create({
    data: { phone, passwordHash: await hashPassword(password) },
  });
}

const login = (phone: string, password: string, ip: string | null = IP) =>
  loginWithPassword({ phone, password, ip, userAgent: "test" });

afterAll(async () => {
  const where = { phone: { in: [...phones] } };
  const users = await db.user.findMany({ where, select: { id: true } });
  const ids = users.map((u) => u.id);
  await db.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
  await db.user.deleteMany({ where });
  await db.otpCode.deleteMany({ where });
  await db.rateLimitEvent.deleteMany({
    where: {
      OR: [
        ...[...phones].map((phone) => ({ key: { endsWith: phone } })),
        { key: { endsWith: IP } },
      ],
    },
  });
  await db.$disconnect();
});

describe("شروع ورود", () => {
  it("کاربر رمزدار ⇒ فرم رمز، بدون ارسال پیامک", async () => {
    const user = await userWithPassword();
    const { provider, sent } = captureSms();
    const result = await startLogin({ phone: user.phone, ip: IP }, provider);
    expect(result).toEqual({ ok: true, method: "PASSWORD" });
    expect(sent).toHaveLength(0);
  });

  it("کاربر جدید ⇒ کد پیامکی؛ پس از ورود باید رمز تعیین کند", async () => {
    const phone = newPhone();
    const { provider, sent } = captureSms();
    const result = await startLogin({ phone, ip: IP }, provider);
    expect(result).toMatchObject({ ok: true, method: "OTP" });
    expect(sent[0]?.to).toBe(phone);

    const otp = await loginWithOtp({
      phone,
      code: sent[0]!.code,
      userAgent: "test",
    });
    expect(otp).toMatchObject({ ok: true, needsPassword: true });
    if (!otp.ok) return;
    const session = await resolveSession(otp.token);
    expect(session?.method).toBe("OTP");
  });
});

describe("ورود با رمز عبور", () => {
  it("رمز درست ⇒ نشست با روش PASSWORD", async () => {
    const user = await userWithPassword();
    const result = await login(user.phone, PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const session = await resolveSession(result.token);
    expect(session).toMatchObject({ userId: user.id, method: "PASSWORD" });
  });

  it("رمز غلط، شماره‌ی ناموجود و کاربر بدون رمز یک پیام کلی دارند", async () => {
    const user = await userWithPassword();
    const noPassword = await db.user.create({ data: { phone: newPhone() } });
    const results = [
      await login(user.phone, "Wrong1234"),
      await login(newPhone(), PASSWORD),
      await login(noPassword.phone, PASSWORD),
    ];
    for (const result of results) {
      expect(result).toEqual({
        ok: false,
        reason: "INVALID_CREDENTIALS",
        message: "شماره‌ی موبایل یا رمز عبور نادرست است.",
      });
    }
  });

  it("پس از ۵ تلاش ناموفق روی یک شماره، حتی رمز درست هم موقتاً رد می‌شود", async () => {
    const user = await userWithPassword();
    for (let i = 0; i < PASSWORD_FAILURE_RULES.phone.limit; i++) {
      expect((await login(user.phone, `Wrong${i}abc`, null)).ok).toBe(false);
    }
    const blocked = await login(user.phone, PASSWORD, null);
    expect(blocked).toMatchObject({ ok: false, reason: "RATE_LIMITED" });
    if (!blocked.ok) expect(blocked.message).toContain("کد پیامکی");
  });

  it("کاربر غیرفعال با رمز درست وارد نمی‌شود", async () => {
    const user = await userWithPassword();
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect(await login(user.phone, PASSWORD)).toMatchObject({
      ok: false,
      reason: "USER_INACTIVE",
    });
  });
});

describe("تعیین و تغییر رمز", () => {
  const otpSession = (sessionId = "s", createdAt = new Date()) => ({
    sessionId,
    method: "OTP" as const,
    createdAt,
  });

  it("رمز فعلی فقط برای کاربر رمزدار بدون ورود پیامکی تازه لازم است", () => {
    const now = new Date();
    const old = new Date(now.getTime() - OTP_RESET_WINDOW_MS - 1000);
    expect(currentPasswordRequired(false, otpSession("s", old), now)).toBe(
      false,
    );
    expect(currentPasswordRequired(true, otpSession("s", now), now)).toBe(
      false,
    );
    expect(currentPasswordRequired(true, otpSession("s", old), now)).toBe(true);
    expect(
      currentPasswordRequired(
        true,
        { method: "PASSWORD", createdAt: now },
        now,
      ),
    ).toBe(true);
  });

  it("ثبت‌نام: رمز بدون رمز فعلی تعیین می‌شود و در AuditLog ثبت می‌شود", async () => {
    const user = await db.user.create({ data: { phone: newPhone() } });
    await setOwnPassword({
      userId: user.id,
      session: otpSession(),
      currentPassword: undefined,
      password: PASSWORD,
    });
    expect((await login(user.phone, PASSWORD)).ok).toBe(true);
    const audit = await db.auditLog.findFirst({
      where: { actorUserId: user.id },
    });
    expect(audit?.action).toBe("auth.password_set");
  });

  it("تغییر رمز با نشست رمزی: رمز فعلی لازم است و نشست‌های دیگر باطل می‌شوند", async () => {
    const user = await userWithPassword();
    const first = await login(user.phone, PASSWORD);
    const second = await login(user.phone, PASSWORD);
    if (!first.ok || !second.ok) throw new Error("login failed");
    const current = await resolveSession(second.token);
    const session = {
      sessionId: current!.sessionId,
      method: current!.method,
      createdAt: current!.createdAt,
    };

    await expect(
      setOwnPassword({
        userId: user.id,
        session,
        currentPassword: "Wrong1234",
        password: "NewPass99",
      }),
    ).rejects.toThrow("رمز عبور فعلی نادرست است.");

    await setOwnPassword({
      userId: user.id,
      session,
      currentPassword: PASSWORD,
      password: "NewPass99",
    });
    expect(await resolveSession(first.token)).toBeNull();
    expect(await resolveSession(second.token)).not.toBeNull();
    expect((await login(user.phone, PASSWORD)).ok).toBe(false);
    expect((await login(user.phone, "NewPass99")).ok).toBe(true);
  });

  it("فراموشی رمز: بعد از ورود پیامکی تازه، رمز فعلی لازم نیست", async () => {
    const user = await userWithPassword();
    await setOwnPassword({
      userId: user.id,
      session: otpSession(),
      currentPassword: undefined,
      password: "Forgot123",
    });
    expect((await login(user.phone, "Forgot123")).ok).toBe(true);
  });

  it("بازیابی از سرور همه‌ی نشست‌ها را باطل می‌کند", async () => {
    const user = await userWithPassword();
    const before = await login(user.phone, PASSWORD);
    if (!before.ok) throw new Error("login failed");
    await resetPasswordByPhone(user.phone, "Server123");
    expect(await resolveSession(before.token)).toBeNull();
    expect((await login(user.phone, "Server123")).ok).toBe(true);
    await expect(resetPasswordByPhone(newPhone(), "Server123")).rejects.toThrow(
      "کاربری با این شماره وجود ندارد.",
    );
  });
});
