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
      accountHolderName: "علی حان",
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
    expect(parseSiteSettings(null).aboutStats).toHaveLength(4);
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
