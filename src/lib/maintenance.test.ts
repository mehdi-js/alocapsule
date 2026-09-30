import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAINTENANCE_MESSAGE,
  isMaintenanceExempt,
  parseMaintenance,
} from "./maintenance";

describe("حالت بروزرسانی", () => {
  it("منو، ورود، ادمین، API و فایل‌های ثابت باز می‌مانند", () => {
    for (const path of [
      "/menu/valiasr",
      "/login",
      "/set-password",
      "/admin",
      "/admin/settings",
      "/api/media/menu/x.webp",
      "/_next/static/chunk.js",
      "/icon.svg",
      "/maintenance",
    ]) {
      expect(isMaintenanceExempt(path), path).toBe(true);
    }
  });

  it("صفحات فروشگاه بسته می‌شوند (پیشوند شبیه هم باز نمی‌کند)", () => {
    for (const path of [
      "/",
      "/products",
      "/products/قطاب",
      "/cart",
      "/checkout",
      "/account/orders",
      "/menus",
      "/administrator",
    ]) {
      expect(isMaintenanceExempt(path), path).toBe(false);
    }
  });

  it("مقدار ذخیره‌شده‌ی ناقص ⇒ خاموش با پیام پیش‌فرض", () => {
    expect(parseMaintenance(null)).toEqual({
      enabled: false,
      message: DEFAULT_MAINTENANCE_MESSAGE,
    });
    expect(parseMaintenance({ enabled: true, message: " " })).toEqual({
      enabled: true,
      message: DEFAULT_MAINTENANCE_MESSAGE,
    });
    expect(parseMaintenance({ enabled: "yes" }).enabled).toBe(false);
  });
});
