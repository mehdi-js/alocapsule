import { describe, expect, it } from "vitest";

import { hasCompletionMarker } from "@/lib/brand";
import {
  BUSINESS_KEYS,
  BUSINESS_SETTING_DEFAULTS,
  DEFAULT_SERVICE_TERMS,
  defaultBusinessSettings,
  parseBusinessSettings,
} from "@/lib/business-settings";
import {
  defaultHomeSettings,
  HOME_KEYS,
  HOME_SETTING_DEFAULTS,
  parseHomeSettings,
} from "@/lib/home-settings";

describe("تنظیمات کسب‌وکار", () => {
  it("پیش‌فرض‌ها مطابق FORK.md §۳.۶", () => {
    const d = defaultBusinessSettings();
    expect(d.pickupHours).toBe("۹ صبح تا ۶ عصر");
    expect(d.phone).toBe("09126270595");
    expect(d.whatsapp).toBe("");
    expect(d.showPricePerKg).toBe(false);
    expect(d.serviceConsentLabel).toBe(
      "شرایط تعویض کپسول را خوانده‌ام و می‌پذیرم",
    );
    // آدرس واقعی ساخته نمی‌شود
    expect(hasCompletionMarker(d.pickupAddress)).toBe(true);
  });

  it("متن پیش‌فرض شرایط خدمت: تعویض با کپسول پرشده + بخش تکمیل کارفرما", () => {
    expect(DEFAULT_SERVICE_TERMS).toContain("از قبل پرشده");
    expect(DEFAULT_SERVICE_TERMS).toContain("همان کپسول خودتان نیست");
    expect(hasCompletionMarker(DEFAULT_SERVICE_TERMS)).toBe(true);
  });

  it("مقدار ذخیره‌شده اولویت دارد؛ نبود/خالی/نوع نادرست ⇒ پیش‌فرض", () => {
    const parsed = parseBusinessSettings(
      new Map<string, unknown>([
        [BUSINESS_KEYS.pickupHours, " ۸ تا ۲۰ "],
        [BUSINESS_KEYS.phone, ""],
        [BUSINESS_KEYS.whatsapp, " https://wa.me/98912 "],
        [BUSINESS_KEYS.showPricePerKg, true],
        [BUSINESS_KEYS.serviceConsentLabel, 42],
      ]),
    );
    expect(parsed.pickupHours).toBe("۸ تا ۲۰");
    expect(parsed.phone).toBe(BUSINESS_SETTING_DEFAULTS[BUSINESS_KEYS.phone]);
    expect(parsed.whatsapp).toBe("https://wa.me/98912");
    expect(parsed.showPricePerKg).toBe(true);
    expect(parsed.serviceConsentLabel).toBe(
      BUSINESS_SETTING_DEFAULTS[BUSINESS_KEYS.serviceConsentLabel],
    );
  });

  it("ساعت کاری: پیش‌فرض ۹ تا ۱۸؛ بازه‌ی وارونه/نامعتبر ⇒ پیش‌فرض", () => {
    const d = defaultBusinessSettings();
    expect([d.openHour, d.closeHour]).toEqual([9, 18]);
    const custom = parseBusinessSettings(
      new Map<string, unknown>([
        [BUSINESS_KEYS.openHour, 8],
        [BUSINESS_KEYS.closeHour, 20],
      ]),
    );
    expect([custom.openHour, custom.closeHour]).toEqual([8, 20]);
    const bad = parseBusinessSettings(
      new Map<string, unknown>([
        [BUSINESS_KEYS.openHour, 20],
        [BUSINESS_KEYS.closeHour, 8],
      ]),
    );
    expect([bad.openHour, bad.closeHour]).toEqual([9, 18]);
    expect(d.shippingAreaNote).toContain("تهران");
  });

  it("showPricePerKg غیر بولی ⇒ خاموش", () => {
    const parsed = parseBusinessSettings(
      new Map<string, unknown>([[BUSINESS_KEYS.showPricePerKg, "true"]]),
    );
    expect(parsed.showPricePerKg).toBe(false);
  });
});

describe("تنظیمات صفحه‌ی اصلی", () => {
  it("پیش‌فرض: ۴ مرحله، ۳ نوع مشتری و آمار خالی", () => {
    const d = defaultHomeSettings();
    expect(d.steps).toHaveLength(4);
    expect(d.customers.map((c) => c.title)).toEqual([
      "خانگی",
      "تجاری",
      "صنعتی",
    ]);
    // آمار ساختگی نداریم؛ خالی ⇒ بخش پنهان می‌شود
    expect(d.stats).toEqual([]);
    expect(d.heroPrimaryCta).toBe("سفارش شارژ کپسول");
    expect(d.heroSecondaryCta).toBe("تماس تلفنی");
  });

  it("مقصد دکمه‌ی اول: فقط مسیر داخلی؛ خارجی/نامعتبر ⇒ پیش‌فرض", () => {
    const parse = (value: unknown) =>
      parseHomeSettings(
        new Map<string, unknown>([[HOME_KEYS.heroPrimaryHref, value]]),
      ).heroPrimaryHref;
    expect(parse("/category/x")).toBe("/category/x");
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "javascript:alert(1)",
      "",
      5,
    ]) {
      expect(parse(bad)).toBe(HOME_SETTING_DEFAULTS[HOME_KEYS.heroPrimaryHref]);
    }
  });

  it("آمار معتبر خوانده می‌شود و عنصر ناقص حذف می‌شود", () => {
    const parsed = parseHomeSettings(
      new Map<string, unknown>([
        [
          HOME_KEYS.stats,
          [
            { label: "سال تجربه", value: "۱۰" },
            { label: "", value: "۵" },
            { label: "بدون مقدار" },
            "x",
          ],
        ],
      ]),
    );
    expect(parsed.stats).toEqual([{ label: "سال تجربه", value: "۱۰" }]);
  });

  it("آمار نامعتبر ⇒ خالی؛ فهرست مراحل خالی/نامعتبر ⇒ پیش‌فرض", () => {
    const parsed = parseHomeSettings(
      new Map<string, unknown>([
        [HOME_KEYS.stats, "ده"],
        [HOME_KEYS.steps, []],
        [HOME_KEYS.customers, [{ title: "فقط عنوان" }]],
      ]),
    );
    expect(parsed.stats).toEqual([]);
    expect(parsed.steps).toEqual(HOME_SETTING_DEFAULTS[HOME_KEYS.steps]);
    expect(parsed.customers).toEqual(
      HOME_SETTING_DEFAULTS[HOME_KEYS.customers],
    );
  });

  it("همه‌ی کلیدهای home.* پیش‌فرض دارند", () => {
    for (const key of Object.values(HOME_KEYS)) {
      expect(HOME_SETTING_DEFAULTS[key]).toBeDefined();
      expect(key.startsWith("home.")).toBe(true);
    }
  });
});
