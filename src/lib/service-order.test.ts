import { describe, expect, it } from "vitest";

import {
  collectServiceTerms,
  isSellable,
  summarizeEmptyCylinders,
} from "@/lib/service-order";

describe("isSellable", () => {
  const base = {
    variantActive: true,
    productActive: true,
    pricingMode: "FIXED" as const,
  };

  it("فعال و قیمت‌دار ⇒ قابل سفارش", () => {
    expect(isSellable(base)).toBe(true);
  });

  it("غیرفعال بودن متغیر یا محصول ⇒ نه", () => {
    expect(isSellable({ ...base, variantActive: false })).toBe(false);
    expect(isSellable({ ...base, productActive: false })).toBe(false);
  });

  it("استعلامی ⇒ هرگز (حتی اگر متغیر فعال باشد)", () => {
    expect(isSellable({ ...base, pricingMode: "INQUIRY" })).toBe(false);
  });
});

describe("collectServiceTerms", () => {
  it("بدون آیتم خدمت ⇒ null", () => {
    expect(collectServiceTerms([])).toBeNull();
    expect(
      collectServiceTerms([
        { kind: "PHYSICAL", productName: "کپسول", terms: "متن" },
      ]),
    ).toBeNull();
  });

  it("چند محصول با متن یکسان ⇒ فقط یک‌بار (بدون تکرار)", () => {
    expect(
      collectServiceTerms([
        { kind: "SERVICE", productName: "شارژ بوتان", terms: "شرایط عمومی" },
        { kind: "SERVICE", productName: "شارژ پروپان", terms: " شرایط عمومی " },
        { kind: "PHYSICAL", productName: "پیک‌نیک", terms: "نادیده" },
      ]),
    ).toBe("شرایط عمومی");
  });

  it("متن‌های متفاوت ⇒ همه با نام محصولشان، متن یکسان یک‌بار", () => {
    const text = collectServiceTerms([
      { kind: "SERVICE", productName: "الف", terms: "متن ۱" },
      { kind: "SERVICE", productName: "ب", terms: "متن ۲" },
      { kind: "SERVICE", productName: "ج", terms: "متن ۱" },
    ]);
    expect(text).toBe("**الف، ج**\nمتن ۱\n\n**ب**\nمتن ۲");
  });

  it("خدمت بدون متن مؤثر نادیده گرفته می‌شود", () => {
    expect(
      collectServiceTerms([
        { kind: "SERVICE", productName: "الف", terms: null },
      ]),
    ).toBeNull();
  });
});

describe("summarizeEmptyCylinders: ترکیب‌های گزینه", () => {
  it("پرسی و بوتان یک محصول جدا شمرده می‌شوند؛ بدون عنوان ترکیب فقط نام", () => {
    const item = (variantTitle: string, quantity: number) => ({
      productKindSnapshot: "SERVICE" as const,
      productName: "شارژ کپسول گاز ۱۱ کیلویی",
      variantTitle,
      quantity,
    });
    expect(
      summarizeEmptyCylinders([
        item("پرسی", 2),
        item("بوتان", 1),
        item("پرسی", 1),
        item("", 4),
      ]),
    ).toEqual([
      { label: "شارژ کپسول گاز ۱۱ کیلویی · پرسی", quantity: 3 },
      { label: "شارژ کپسول گاز ۱۱ کیلویی · بوتان", quantity: 1 },
      { label: "شارژ کپسول گاز ۱۱ کیلویی", quantity: 4 },
    ]);
  });
});

describe("summarizeEmptyCylinders", () => {
  it("فقط خدمت، جمع تعداد به تفکیک محصول و متغیر", () => {
    const rows = summarizeEmptyCylinders([
      {
        productKindSnapshot: "SERVICE",
        productName: "شارژ بوتان",
        variantTitle: "۱۱ کیلوگرم",
        quantity: 2,
      },
      {
        productKindSnapshot: "SERVICE",
        productName: "شارژ بوتان",
        variantTitle: "۱۱ کیلوگرم",
        quantity: 1,
      },
      {
        productKindSnapshot: "SERVICE",
        productName: "شارژ بوتان",
        variantTitle: "۲۵ کیلوگرم",
        quantity: 4,
      },
      {
        productKindSnapshot: "PHYSICAL",
        productName: "کپسول نو",
        variantTitle: "۱۱ کیلوگرم",
        quantity: 9,
      },
    ]);
    expect(rows).toEqual([
      { label: "شارژ بوتان · ۱۱ کیلوگرم", quantity: 3 },
      { label: "شارژ بوتان · ۲۵ کیلوگرم", quantity: 4 },
    ]);
  });

  it("بدون خدمت ⇒ خالی", () => {
    expect(
      summarizeEmptyCylinders([
        {
          productKindSnapshot: "PHYSICAL",
          productName: "کپسول",
          variantTitle: "x",
          quantity: 1,
        },
      ]),
    ).toEqual([]);
  });
});
