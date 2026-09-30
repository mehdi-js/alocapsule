import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BUSINESS_KEYS } from "@/lib/business-settings";
import { db } from "@/lib/db";
import { HOME_KEYS } from "@/lib/home-settings";
import { ORDER_NUMBER_PREFIX_KEY } from "@/lib/order-number";
import {
  businessSettingsSchema,
  homeSettingsSchema,
} from "@/lib/validation/store-content";
import { getSettings } from "@/server/repositories/setting.repository";
import { cleanupFixtures, createAdmin } from "@/test/order-fixtures";

import { getOrderNumberPrefix } from "./order-number.service";
import {
  getBusinessSettingsForm,
  saveBusinessSettings,
  saveHomeSettings,
} from "./store-content.service";

/** ذخیره و خواندن دوباره‌ی کلیدهای `business.*`، `service.*`، `home.*` و شماره‌ی سفارش */

const ALL_KEYS = [
  ...Object.values(BUSINESS_KEYS),
  ...Object.values(HOME_KEYS),
  ORDER_NUMBER_PREFIX_KEY,
];

let adminId = "";
let backup = new Map<string, unknown>();

beforeAll(async () => {
  adminId = await createAdmin();
  backup = await getSettings(ALL_KEYS);
});

afterAll(async () => {
  // مقدارهای seed شده را برمی‌گردانیم
  await db.setting.deleteMany({ where: { key: { in: ALL_KEYS } } });
  for (const [key, value] of backup) {
    await db.setting.create({ data: { key, value: value as never } });
  }
  await cleanupFixtures();
});

describe("تنظیمات کسب‌وکار و خدمت", () => {
  it("ذخیره و خواندن دوباره؛ لاگ ممیزی بدون متن بلند", async () => {
    const before = await getBusinessSettingsForm();
    const input = businessSettingsSchema.parse({
      ...before,
      phone: "۰۲۱-۲۲۳۳۴۴۵۵",
      pickupHours: "۸ تا ۲۰",
      pickupAddress: "تهران، محل تحویل نمونه",
      whatsapp: "https://wa.me/989121234567",
      serviceDefaultTerms: "متن جدید شرایط خدمت که به اندازه‌ی کافی بلند است.",
      showPricePerKg: true,
      orderNumberPrefix: "zx9",
    });
    await saveBusinessSettings(adminId, input);

    const after = await getBusinessSettingsForm();
    expect(after).toMatchObject({
      phone: "02122334455",
      pickupHours: "۸ تا ۲۰",
      whatsapp: "https://wa.me/989121234567",
      serviceDefaultTerms: input.serviceDefaultTerms,
      showPricePerKg: true,
      orderNumberPrefix: "ZX9",
    });
    expect(await getOrderNumberPrefix()).toBe("ZX9");

    const log = await db.auditLog.findFirst({
      where: { actorUserId: adminId, action: "settings.business_updated" },
    });
    expect(JSON.stringify(log?.metadata)).not.toContain("متن جدید شرایط");
  });
});

describe("تنظیمات صفحه‌ی اصلی", () => {
  it("آمار خالی و غیرخالی ذخیره و خوانده می‌شود", async () => {
    const { defaultHomeSettings } = await import("@/lib/home-settings");
    const base = defaultHomeSettings();
    await saveHomeSettings(
      adminId,
      homeSettingsSchema.parse({
        ...base,
        heroTitle: "تیتر تازه",
        stats: [{ label: "سال تجربه", value: "۱۰" }],
      }),
    );
    const { getHomeSettings } = await import("./store-content.service");
    // cache() فقط داخل درخواست React است؛ اینجا هر فراخوانی تازه می‌خواند
    const saved = await getHomeSettings();
    expect(saved.heroTitle).toBe("تیتر تازه");
    expect(saved.stats).toEqual([{ label: "سال تجربه", value: "۱۰" }]);

    await saveHomeSettings(
      adminId,
      homeSettingsSchema.parse({ ...base, stats: [] }),
    );
    expect((await getHomeSettings()).stats).toEqual([]);
  });
});
