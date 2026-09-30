import { randomInt } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { SmsProvider } from "@/lib/sms";

import { retryFailedNotifications } from "./notification.service";
import { requestOtp } from "./otp.service";

/** ثبت ارسال کد ورود در لاگ پیامک‌ها: بدون خود کد، بدون تلاش دوباره */

const phones: string[] = [];
const IP = `10.98.${randomInt(0, 255)}.${randomInt(1, 255)}`;

function newPhone() {
  const phone = `0997${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
  phones.push(phone);
  return phone;
}

function provider(ok: boolean) {
  const sent: string[][] = [];
  const sms: SmsProvider = {
    name: "melipayamak",
    async sendPattern({ args }) {
      sent.push(args);
      return ok
        ? { ok: true, providerMessageId: "123456789012345678" }
        : { ok: false, errorCode: "-109", errorMessage: "IP مجاز نیست" };
    },
  };
  return { sms, sent };
}

afterAll(async () => {
  await db.notificationLog.deleteMany({ where: { phone: { in: phones } } });
  await db.otpCode.deleteMany({ where: { phone: { in: phones } } });
  await db.rateLimitEvent.deleteMany({
    where: {
      OR: [
        ...phones.map((phone) => ({ key: { endsWith: phone } })),
        { key: { endsWith: IP } },
      ],
    },
  });
  await db.$disconnect();
});

describe("لاگ کد ورود", () => {
  it("ارسال موفق با recId ثبت می‌شود و خود کد در لاگ نیست", async () => {
    const phone = newPhone();
    const { sms, sent } = provider(true);
    expect((await requestOtp({ phone, ip: IP }, sms)).ok).toBe(true);

    const log = await db.notificationLog.findFirstOrThrow({ where: { phone } });
    expect(log).toMatchObject({
      type: "OTP",
      status: "SENT",
      orderId: null,
      providerMessageId: "123456789012345678",
    });
    const code = sent[0]![0]!;
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(log.payload)).not.toContain(code);
    expect(JSON.stringify(log.payload)).toContain("••••••");
  });

  it("ارسال ناموفق با علت ثبت می‌شود و job آن را دوباره نمی‌فرستد", async () => {
    const phone = newPhone();
    const { sms } = provider(false);
    expect((await requestOtp({ phone, ip: IP }, sms)).ok).toBe(false);

    const log = await db.notificationLog.findFirstOrThrow({ where: { phone } });
    expect(log.status).toBe("FAILED");
    expect(log.errorMessage).toBe("-109: IP مجاز نیست");

    await retryFailedNotifications();
    const after = await db.notificationLog.findFirstOrThrow({
      where: { phone },
    });
    expect(after.attempts).toBe(1);
  });
});
