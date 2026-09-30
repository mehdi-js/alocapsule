import { describe, expect, it } from "vitest";

import {
  DEFAULT_ORDER_NUMBER_PREFIX,
  formatOrderNumber,
  isValidOrderNumberPrefix,
  ORDER_NUMBER_PATTERN,
  orderNumberPrefix,
  parseOrderNumberPrefix,
} from "@/lib/order-number";
import {
  canTransition,
  notificationsForTransition,
  ORDER_TRANSITIONS,
  type OrderStatus,
} from "@/lib/order-status";
import { isServedLocation, isShippingAvailableIn } from "@/lib/service-area";

describe("انتقال وضعیت سفارش (بند ۷.۷ + پرداخت کیف پول)", () => {
  it("فقط انتقال‌های جدول سند مجاز است", () => {
    const allowed: [OrderStatus, OrderStatus][] = [
      ["PENDING_PAYMENT", "PAYMENT_REVIEW"],
      ["PENDING_PAYMENT", "CANCELED"],
      ["PENDING_PAYMENT", "PROCESSING"],
      ["PAYMENT_REVIEW", "PROCESSING"],
      ["PAYMENT_REVIEW", "PAYMENT_REJECTED"],
      ["PAYMENT_REJECTED", "PAYMENT_REVIEW"],
      ["PAYMENT_REJECTED", "CANCELED"],
      ["PAYMENT_REJECTED", "PROCESSING"],
      ["PROCESSING", "SHIPPED"],
      ["PROCESSING", "CANCELED"],
      ["SHIPPED", "DELIVERED"],
    ];
    const statuses = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];
    for (const from of statuses) {
      for (const to of statuses) {
        const expected = allowed.some(([a, b]) => a === from && b === to);
        expect(canTransition(from, to), `${from} → ${to}`).toBe(expected);
      }
    }
  });

  it("رویداد اعلان هر انتقال", () => {
    const n = notificationsForTransition;
    expect(n("PAYMENT_REVIEW", "PROCESSING")).toEqual(["PAYMENT_APPROVED"]);
    expect(n("PAYMENT_REVIEW", "PAYMENT_REJECTED")).toEqual([
      "PAYMENT_REJECTED",
    ]);
    // پرداخت با کیف پول: مشتری + مدیر
    expect(n("PENDING_PAYMENT", "PROCESSING")).toEqual([
      "PAYMENT_APPROVED",
      "ADMIN_WALLET_PAID",
    ]);
    // رسید جدید (اول یا پس از رد) ⇒ پیامک مدیر
    expect(n("PENDING_PAYMENT", "PAYMENT_REVIEW")).toEqual([
      "ADMIN_RECEIPT_SUBMITTED",
    ]);
    expect(n("PAYMENT_REJECTED", "PAYMENT_REVIEW")).toEqual([
      "ADMIN_RECEIPT_SUBMITTED",
    ]);
    expect(n("PROCESSING", "SHIPPED")).toEqual(["ORDER_SHIPPED"]);
    expect(n("PENDING_PAYMENT", "CANCELED")).toEqual(["ORDER_CANCELED"]);
    expect(n("SHIPPED", "DELIVERED")).toEqual([]);
  });
});

describe("شماره‌ی سفارش", () => {
  it("پیشوند + تاریخ شمسی تهران + ردیف ۴ رقمی", () => {
    // ۲۰:۳۰ UTC = ۰۰:۰۰ تهران، ۱ مهر ۱۴۰۴
    expect(formatOrderNumber("2025-09-22T20:30:00Z", 31, "XY")).toBe(
      "XY-14040701-0031",
    );
    expect(orderNumberPrefix("2025-09-22T20:29:00Z", "XY")).toBe(
      "XY-14040631-",
    );
    expect(formatOrderNumber("2025-09-22T20:30:00Z", 12345, "XY")).toBe(
      "XY-14040701-12345",
    );
    expect(() => formatOrderNumber(new Date(), 0, "XY")).toThrow(RangeError);
  });

  it("الگو با هر پیشوند معتبر کار می‌کند و پیشوند نامعتبر رد می‌شود", () => {
    expect(ORDER_NUMBER_PATTERN.test("XY-14040701-0031")).toBe(true);
    expect(ORDER_NUMBER_PATTERN.test("ABC123-14040701-12345")).toBe(true);
    expect(ORDER_NUMBER_PATTERN.test("xy-14040701-0031")).toBe(false);
    expect(ORDER_NUMBER_PATTERN.test("14040701-0031")).toBe(false);
    expect(isValidOrderNumberPrefix("XY")).toBe(true);
    expect(isValidOrderNumberPrefix("X-Y")).toBe(false);
    expect(isValidOrderNumberPrefix("")).toBe(false);
    expect(isValidOrderNumberPrefix("ABCDEFGHI")).toBe(false);
  });

  it("مقدار نبود/نامعتبر تنظیمات ⇒ پیشوند پیش‌فرض", () => {
    expect(parseOrderNumberPrefix("QZ")).toBe("QZ");
    expect(parseOrderNumberPrefix(undefined)).toBe(DEFAULT_ORDER_NUMBER_PREFIX);
    expect(parseOrderNumberPrefix(null)).toBe(DEFAULT_ORDER_NUMBER_PREFIX);
    expect(parseOrderNumberPrefix("bad prefix")).toBe(
      DEFAULT_ORDER_NUMBER_PREFIX,
    );
  });
});

describe("منطقه‌ی ارسال", () => {
  it("فقط شهر تهران پوشش داده می‌شود", () => {
    expect(isServedLocation("تهران", "تهران")).toBe(true);
    expect(isServedLocation("تهران", "شهریار")).toBe(false);
    expect(isServedLocation("فارس", "شیراز")).toBe(false);
  });

  it("روش ارسال بدون استان برای همه‌ی مناطق است", () => {
    expect(isShippingAvailableIn([], "تهران")).toBe(true);
    expect(isShippingAvailableIn(["تهران"], "تهران")).toBe(true);
    expect(isShippingAvailableIn(["تهران"], "البرز")).toBe(false);
  });
});
