import { describe, expect, it } from "vitest";

import { parseSiteSettings, phoneHref, socialLinks } from "@/lib/site-settings";
import {
  bankCardSchema,
  generalSettingsSchema,
  isValidCardNumber,
  isValidSheba,
  shippingMethodSchema,
} from "@/lib/validation/settings";

describe("کارت و شبا", () => {
  it("Luhn و mod 97", () => {
    expect(isValidCardNumber("6037997599999993")).toBe(true);
    expect(isValidCardNumber("6037997599999992")).toBe(false);
    expect(isValidSheba("IR820540102680020817909002")).toBe(true);
    expect(isValidSheba("IR820540102680020817909003")).toBe(false);
  });

  it("نرمال‌سازی ارقام فارسی، فاصله و پیشوند IR", () => {
    const parsed = bankCardSchema.parse({
      bankName: "ملت",
      cardNumber: "۶۰۳۷ ۹۹۷۵ ۹۹۹۹ ۹۹۹۳",
      shebaNumber: "820540102680020817909002",
      accountHolderName: "الو کپسول",
      isActive: true,
      sortOrder: 1,
    });
    expect(parsed.cardNumber).toBe("6037997599999993");
    expect(parsed.shebaNumber).toBe("IR820540102680020817909002");
  });
});

describe("روش ارسال", () => {
  it("استان خارج از منطقه‌ی تحت پوشش رد می‌شود", () => {
    const base = {
      name: "پیک",
      description: "",
      cost: 60_000,
      freeAboveAmount: null,
      provinces: ["تهران"],
      payOnDelivery: false,
      isActive: true,
      sortOrder: 1,
    };
    expect(shippingMethodSchema.parse(base).description).toBeNull();
    expect(
      shippingMethodSchema.safeParse({ ...base, provinces: ["فارس"] }).success,
    ).toBe(false);
  });
});

describe("محتوای سایت", () => {
  it("مقدار ناقص با پیش‌فرض کامل می‌شود", () => {
    const settings = parseSiteSettings({
      contact: { phone: "۰۲۱-۱۱۱" },
      trustItems: [{ title: "یک" }],
      branches: [],
    });
    expect(settings.contact.phone).toBe("۰۲۱-۱۱۱");
    expect(settings.contact.email).not.toBe("");
    expect(settings.trustItems).toHaveLength(3);
    // آمار «درباره ما» پیش‌فرض خالی است (عدد ساختگی نمی‌گذاریم)
    expect(parseSiteSettings(null).aboutStats).toEqual([]);
  });

  it("لینک تلفن و شبکه‌های خالی", () => {
    expect(phoneHref("۰۲۱-۲۲۳۴۵۶۷۸")).toBe("tel:+982122345678");
    expect(
      socialLinks({
        instagram: "https://instagram.com/x",
        telegram: "",
        whatsapp: " ",
      }),
    ).toEqual([
      {
        key: "instagram",
        label: "اینستاگرام",
        href: "https://instagram.com/x",
      },
    ]);
  });
});

describe("روش ارسال با پرداخت درب منزل", () => {
  it("هزینه و آستانه در سایت صفر می‌شوند", () => {
    const parsed = shippingMethodSchema.parse({
      name: "ارسال با پیک",
      description: "",
      cost: 50_000,
      freeAboveAmount: 1_000_000,
      provinces: [],
      payOnDelivery: true,
      isActive: true,
      sortOrder: 1,
    });
    expect(parsed).toMatchObject({ cost: 0, freeAboveAmount: null });
  });
});

describe("کد اینماد در تنظیمات عمومی", () => {
  const field = generalSettingsSchema.shape.enamad;

  it("خالی ⇒ null؛ کد کامل ⇒ فقط id و Code", () => {
    expect(field.parse("  ")).toBeNull();
    expect(
      field.parse(
        "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=612345&Code=AbCdEf123456'><img src='x'></a>",
      ),
    ).toEqual({ id: "612345", code: "AbCdEf123456" });
  });

  it("کد ناشناخته ⇒ خطای فارسی", () => {
    const result = field.safeParse("<script>alert(1)</script>");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("اینماد");
  });
});

describe("روش ارسال: تحویل حضوری و ارسال رایگان تعدادی (FORK.md §۳.۳)", () => {
  const base = {
    name: "روش نمونه",
    description: "",
    cost: 100_000,
    freeAboveAmount: null,
    provinces: [],
    payOnDelivery: false,
    isActive: true,
    sortOrder: 1,
  };

  it("فیلدهای جدید اختیاری‌اند و نفرستادنشان مقدار قبلی را دست‌نخورده می‌گذارد", () => {
    const parsed = shippingMethodSchema.parse(base);
    expect(parsed.requiresAddress).toBeUndefined();
    expect(parsed.freeAboveQuantity).toBeUndefined();
  });

  it("تحویل حضوری و آستانه‌ی تعداد", () => {
    const parsed = shippingMethodSchema.parse({
      ...base,
      requiresAddress: false,
      freeAboveQuantity: 10,
    });
    expect(parsed.requiresAddress).toBe(false);
    expect(parsed.freeAboveQuantity).toBe(10);
    expect(
      shippingMethodSchema.parse({ ...base, freeAboveQuantity: null })
        .freeAboveQuantity,
    ).toBeNull();
  });

  it("آستانه‌ی تعداد باید عدد صحیح مثبت باشد", () => {
    for (const bad of [0, -1, 2.5, 100_000]) {
      expect(
        shippingMethodSchema.safeParse({ ...base, freeAboveQuantity: bad })
          .success,
      ).toBe(false);
    }
  });

  it("پرداخت درب منزل ⇒ آستانه‌ی تعداد هم صفر (null) می‌شود", () => {
    const parsed = shippingMethodSchema.parse({
      ...base,
      payOnDelivery: true,
      freeAboveQuantity: 10,
    });
    expect(parsed.freeAboveQuantity).toBeNull();
    expect(parsed.cost).toBe(0);
  });
});
