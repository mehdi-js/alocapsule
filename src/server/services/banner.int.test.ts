import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_BANNERS } from "@/lib/banners";
import { db } from "@/lib/db";
import type { StorageDriver } from "@/lib/storage";
import {
  cleanupFixtures,
  createAdmin,
  receiptPng,
} from "@/test/order-fixtures";
import { setAsideSettings } from "@/test/settings-snapshot";

import { getBanners, saveBanners, uploadBannerImage } from "./banner.service";

/** بنرها: آپلود دو نسخه، ذخیره، رد آدرس بیگانه، حذف فایل جایگزین‌شده */

let adminId: string;
let restoreSettings: () => Promise<void>;

function memoryStorage() {
  const files = new Map<string, Buffer>();
  const driver: StorageDriver = {
    name: "local",
    async put({ key, body }) {
      files.set(key, body);
    },
    async delete(key) {
      files.delete(key);
    },
    publicUrl: (key) => `/test-media/${key}`,
    keyFromUrl: (url) =>
      url.startsWith("/test-media/") ? url.slice("/test-media/".length) : null,
  };
  return { driver, files };
}

beforeAll(async () => {
  adminId = await createAdmin();
  restoreSettings = await setAsideSettings(["site.banners"]);
});

afterAll(async () => {
  await restoreSettings();
  await cleanupFixtures();
});

describe("بنرها و اسلایدر", () => {
  it("ذخیره با تصاویر دسکتاپ/موبایل و حذف فایل جایگزین‌شده", async () => {
    const { driver, files } = memoryStorage();
    const desktop = await uploadBannerImage(
      await receiptPng(),
      "desktop",
      driver,
    );
    const mobile = await uploadBannerImage(
      await receiptPng(),
      "mobile",
      driver,
    );
    expect(desktop).toMatch(/^\/test-media\/banners\/[0-9a-f-]{36}\.webp$/);

    const settings = structuredClone(DEFAULT_BANNERS);
    settings.heroSlides[0] = {
      ...settings.heroSlides[0]!,
      title: "  خط اول \n\n خط دوم ",
      desktop,
      mobile,
    };
    await saveBanners(adminId, settings, driver);
    const saved = (
      await db.setting.findUniqueOrThrow({ where: { key: "site.banners" } })
    ).value as { heroSlides: { title: string; desktop: string }[] };
    expect(saved.heroSlides[0]).toMatchObject({
      title: "خط اول\nخط دوم",
      desktop,
    });

    // جایگزینی نسخه‌ی موبایل ⇒ فایل قبلی پاک می‌شود
    const replacement = await uploadBannerImage(
      await receiptPng(),
      "mobile",
      driver,
    );
    settings.heroSlides[0]!.mobile = replacement;
    await saveBanners(adminId, settings, driver);
    expect(files.has(mobile.replace("/test-media/", ""))).toBe(false);
    expect(files.has(desktop.replace("/test-media/", ""))).toBe(true);
    expect(files.size).toBe(2);
  });

  it("آدرس تصویری که مال بنرهای سایت نیست پذیرفته نمی‌شود", async () => {
    const { driver } = memoryStorage();
    const settings = structuredClone(DEFAULT_BANNERS);
    settings.images.promo.desktop = "https://evil.example/x.webp";
    await expect(saveBanners(adminId, settings, driver)).rejects.toThrow(
      "تصاویر نامعتبر",
    );
    settings.images.promo.desktop = "/test-media/products/x.webp";
    await expect(saveBanners(adminId, settings, driver)).rejects.toThrow(
      "تصاویر نامعتبر",
    );
  });

  it("فایل غیرتصویری رد می‌شود", async () => {
    const { driver } = memoryStorage();
    await expect(
      uploadBannerImage(Buffer.from("not an image"), "desktop", driver),
    ).rejects.toThrow();
    expect((await getBanners()).heroSlides.length).toBeGreaterThan(0);
  });
});
