import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { cleanupFixtures, createAdmin } from "@/test/order-fixtures";
import { setAsideSettings } from "@/test/settings-snapshot";

import {
  getSmsConnection,
  getSmsProvider,
  saveSmsConnection,
} from "./sms-connection.service";

/** اتصال پیامک از پنل: مقدم بر .env، رمزنگاری رمز، بازگشت به .env */

let adminId: string;
const saved = { provider: process.env.SMS_PROVIDER };
let restoreSettings: () => Promise<void>;

beforeAll(async () => {
  adminId = await createAdmin();
  process.env.SMS_PROVIDER = "console";
  restoreSettings = await setAsideSettings(["sms.connection"]);
});

afterAll(async () => {
  await restoreSettings();
  process.env.SMS_PROVIDER = saved.provider;
  await cleanupFixtures();
});

describe("اتصال پیامک از پنل", () => {
  it("بدون تنظیم پنل ⇒ .env", async () => {
    expect((await getSmsProvider()).name).toBe("console");
    const dto = await getSmsConnection();
    expect(dto).toMatchObject({ provider: "", hasPassword: false });
  });

  it("پنل بر .env مقدم است و رمز رمزنگاری‌شده ذخیره می‌شود", async () => {
    await saveSmsConnection(adminId, {
      provider: "melipayamak",
      username: "alihan-panel",
      newPassword: "super-secret-api-key",
      clearPassword: false,
    });
    expect((await getSmsProvider()).name).toBe("melipayamak");

    const row = await db.setting.findUniqueOrThrow({
      where: { key: "sms.connection" },
    });
    expect(JSON.stringify(row.value)).not.toContain("super-secret-api-key");
    expect(await getSmsConnection()).toMatchObject({
      provider: "melipayamak",
      username: "alihan-panel",
      hasPassword: true,
      passwordUnreadable: false,
    });

    const audit = await db.auditLog.findFirstOrThrow({
      where: {
        actorUserId: adminId,
        action: "settings.sms_connection_updated",
      },
    });
    expect(JSON.stringify(audit.metadata)).not.toContain("super-secret");
  });

  it("رمز خالی ⇒ رمز قبلی می‌ماند؛ حذف رمز ⇒ .env", async () => {
    await saveSmsConnection(adminId, {
      provider: "melipayamak",
      username: "alihan-panel",
      newPassword: "",
      clearPassword: false,
    });
    expect((await getSmsConnection()).hasPassword).toBe(true);

    await saveSmsConnection(adminId, {
      provider: "melipayamak",
      username: "alihan-panel",
      newPassword: "",
      clearPassword: true,
    });
    expect((await getSmsConnection()).hasPassword).toBe(false);
    // بدون رمز (نه در پنل نه در .env) ⇒ پیکربندی ناقص
    const envPassword = process.env.MELIPAYAMAK_PASSWORD;
    delete process.env.MELIPAYAMAK_PASSWORD;
    try {
      await expect(getSmsProvider()).rejects.toThrow("MELIPAYAMAK_PASSWORD");
    } finally {
      if (envPassword !== undefined)
        process.env.MELIPAYAMAK_PASSWORD = envPassword;
    }
  });
});
