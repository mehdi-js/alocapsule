import { describe, expect, it } from "vitest";

import { buildShippingInfo, type ShippingInfoMethod } from "./shipping-info";

const normal: ShippingInfoMethod = {
  name: "ارسال عادی",
  requiresAddress: true,
  cost: 0,
  payOnDelivery: false,
  deliveryEstimate: "۱ روزه",
  freeAboveQuantity: 100,
};
const express: ShippingInfoMethod = {
  name: "ارسال فوری",
  requiresAddress: true,
  cost: 150_000,
  payOnDelivery: false,
  deliveryEstimate: "۱ تا ۴ ساعت",
  freeAboveQuantity: null,
};
const pickup: ShippingInfoMethod = {
  name: "تحویل حضوری",
  requiresAddress: false,
  cost: 0,
  payOnDelivery: false,
  deliveryEstimate: null,
  freeAboveQuantity: null,
};

describe("buildShippingInfo", () => {
  it("سه روش: زمان، هزینه‌ی واردشده، ساعت تحویل حضوری و آستانه‌ی رایگان", () => {
    const texts = buildShippingInfo(
      [normal, express, pickup],
      "۹ صبح تا ۶ عصر",
    ).map((item) => item.text);
    expect(texts).toEqual([
      "ارسال عادی: ۱ روزه",
      "ارسال فوری: ۱ تا ۴ ساعت · هزینه ۱۵۰,۰۰۰ تومان",
      "تحویل حضوری: ۹ صبح تا ۶ عصر",
      "ارسال عادی رایگان از ۱۰۰ عدد به بالا",
    ]);
  });

  it("روش حذف‌شده (غیرفعال) در ردیف نیست و بدون روش ⇒ خالی", () => {
    const texts = buildShippingInfo([normal, pickup], "۹ تا ۱۸").map(
      (item) => item.text,
    );
    expect(texts.some((text) => text.includes("فوری"))).toBe(false);
    expect(buildShippingInfo([], "۹ تا ۱۸")).toEqual([]);
  });

  it("روش بدون زمان فقط نام؛ پرداخت درب منزل هزینه نمی‌گیرد", () => {
    const item = buildShippingInfo(
      [{ ...express, deliveryEstimate: null, payOnDelivery: true }],
      "",
    )[0]!;
    expect(item.text).toBe("ارسال فوری");
  });
});
