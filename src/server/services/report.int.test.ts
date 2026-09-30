import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { jalaliToDate } from "@/lib/date";
import { resolveRange } from "@/lib/report-range";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCustomer,
} from "@/test/order-fixtures";
import { createReportOrder } from "@/test/report-fixtures";

import { getDashboard } from "./report.service";

/**
 * 🔴 ارقام گزارش با جمع دستی: سفارش‌ها در فروردین ۱۳۹۰ ساخته می‌شوند تا با
 * داده‌ی دیگر قاطی نشوند. «فروش» = پرداخت‌شده و لغونشده، به تاریخ ثبت.
 */

let catalog: Catalog;
let range: Awaited<ReturnType<typeof getDashboard>>["range"];

beforeAll(async () => {
  catalog = await createCatalog();
  const { userId } = await createCustomer();
  const small = {
    variantId: catalog.small,
    name: "محصول تست",
    title: "۵۰۰ گرم",
    price: 400_000,
  };
  /** همان متغیر، اما آیتم «خدمت» (اسنپ‌شات نوع) */
  const smallService = { ...small, kind: "SERVICE" as const };
  const large = {
    variantId: catalog.large,
    name: "محصول تست",
    title: "۱ کیلوگرم",
    price: 750_000,
  };
  const order = (
    placedAt: Date,
    status: "PENDING_PAYMENT" | "PROCESSING" | "DELIVERED" | "CANCELED",
    paid: boolean,
    items: { variant: typeof small | typeof smallService; quantity: number }[],
    shippingTotal: number,
    discountTotal: number,
    couponCode: string | null = null,
  ) =>
    createReportOrder({
      userId,
      placedAt,
      status,
      paid,
      productId: catalog.productId,
      items: items.map(({ variant, quantity }) => ({ ...variant, quantity })),
      shippingTotal,
      discountTotal,
      couponCode,
    });

  // A: ۵ فروردین، ۸۰۰٬۰۰۰ + ۹۰٬۰۰۰ − ۸۰٬۰۰۰ = ۸۱۰٬۰۰۰ (آیتم خدمت)
  await order(
    jalaliToDate(1390, 1, 5, 10),
    "PROCESSING",
    true,
    [{ variant: smallService, quantity: 2 }],
    90_000,
    80_000,
    "REPORTA",
  );
  // B: ۵ فروردین ۲۳:۳۰ تهران (همان روز)، ۷۵۰٬۰۰۰
  await order(
    jalaliToDate(1390, 1, 5, 23, 30),
    "DELIVERED",
    true,
    [{ variant: large, quantity: 1 }],
    0,
    0,
  );
  // C: پرداخت‌شده ولی لغوشده ⇒ فروش نیست
  await order(
    jalaliToDate(1390, 1, 10, 12),
    "CANCELED",
    true,
    [{ variant: small, quantity: 1 }],
    90_000,
    0,
  );
  // D: پرداخت‌نشده ⇒ فروش نیست
  await order(
    jalaliToDate(1390, 1, 10, 13),
    "PENDING_PAYMENT",
    false,
    [{ variant: large, quantity: 3 }],
    90_000,
    0,
  );
  // E: آخرین دقیقه‌ی ۳۱ فروردین ⇒ داخل بازه؛ ۱٬۵۰۰٬۰۰۰ + ۹۰٬۰۰۰ − ۱۵۰٬۰۰۰
  await order(
    jalaliToDate(1390, 1, 31, 23, 59),
    "PROCESSING",
    true,
    [{ variant: large, quantity: 2 }],
    90_000,
    150_000,
    "REPORTA",
  );
  // F: ۱ اردیبهشت ۰۰:۰۰ ⇒ بیرون بازه (مرز ماه)
  await order(
    jalaliToDate(1390, 2, 1, 0, 0),
    "PROCESSING",
    true,
    [{ variant: small, quantity: 1 }],
    0,
    0,
  );
  // G: ۲۹ اسفند ۱۳۸۹ ۲۳:۵۹ ⇒ بیرون بازه (مرز سال)
  await order(
    jalaliToDate(1389, 12, 29, 23, 59),
    "PROCESSING",
    true,
    [{ variant: small, quantity: 1 }],
    0,
    0,
  );

  const resolved = resolveRange({
    preset: "custom",
    from: "1390/01/01",
    to: "1390/01/31",
  });
  if (!resolved.ok) throw new Error(resolved.message);
  range = (await getDashboard(resolved.range)).range;
});

afterAll(async () => {
  await cleanupFixtures();
});

describe("گزارش فروش", () => {
  it("🔴 خلاصه: فقط پرداخت‌شده‌ی لغونشده، فروش = grandTotal، تخفیف جدا", () => {
    // ۸۱۰٬۰۰۰ + ۷۵۰٬۰۰۰ + ۱٬۴۴۰٬۰۰۰
    expect(range.summary).toEqual({
      sales: 3_000_000,
      orders: 3,
      discount: 230_000,
      shipping: 180_000,
      average: 1_000_000,
    });
  });

  it("🔴 فروش روزانه با مرز روز تهران و روزهای خالی", () => {
    expect(range.daily).toHaveLength(31);
    const byDay = Object.fromEntries(
      range.daily
        .filter((d) => d.sales > 0)
        .map((d) => [d.day, [d.sales, d.orders]]),
    );
    expect(byDay).toEqual({
      "1390/01/05": [1_560_000, 2],
      "1390/01/31": [1_440_000, 1],
    });
    expect(range.daily[0]?.day).toBe("1390/01/01");
    expect(range.daily.at(-1)?.day).toBe("1390/01/31");
  });

  it("سهم دسته، پرفروش‌ها و تخفیف به تفکیک کد", () => {
    const test = range.categories.find((c) => c.name.startsWith("دسته‌ی تست"));
    expect(test).toMatchObject({ total: 3_050_000, quantity: 5 });
    // نوع محصول در جدول = نوع آخرین فروش (E: کالای فیزیکی)
    expect(range.topProducts).toEqual([
      { name: "محصول تست", kind: "PHYSICAL", quantity: 5, total: 3_050_000 },
    ]);
    expect(range.topVariants).toEqual([
      {
        productName: "محصول تست",
        variantTitle: "۱ کیلوگرم",
        quantity: 3,
        total: 2_250_000,
      },
      {
        productName: "محصول تست",
        variantTitle: "۵۰۰ گرم",
        quantity: 2,
        total: 800_000,
      },
    ]);
    expect(range.discounts).toEqual([
      { code: "REPORTA", orders: 2, discount: 230_000, sales: 2_250_000 },
    ]);
  });

  it("🔴 فروش به تفکیک نوع: جمع دستی مبلغ اقلام (A خدمت؛ B و E کالا)", () => {
    // خدمت: ۲×۴۰۰٬۰۰۰ = ۸۰۰٬۰۰۰ (۱ سفارش)
    // کالا: ۱×۷۵۰٬۰۰۰ + ۲×۷۵۰٬۰۰۰ = ۲٬۲۵۰٬۰۰۰ (۲ سفارش)
    expect(range.kinds).toEqual([
      { kind: "SERVICE", total: 800_000, quantity: 2, orders: 1 },
      { kind: "PHYSICAL", total: 2_250_000, quantity: 3, orders: 2 },
    ]);
    // جمع دو نوع = جمع مبلغ اقلام دسته‌ها
    expect(range.kinds.reduce((sum, row) => sum + row.total, 0)).toBe(
      3_050_000,
    );
  });
});
