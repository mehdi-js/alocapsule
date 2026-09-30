import { randomBytes } from "node:crypto";

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "@/lib/db";
import {
  buildSizeSwitch,
  parseSelectionParams,
  resolveSelected,
} from "@/lib/option-selection";
import { parseOrderFilters } from "@/lib/order-filters";
import { toPersianDigits } from "@/lib/utils";
import { productInputSchema } from "@/lib/validation/product";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCustomer,
  fillCart,
  ordersOf,
  placeOrder,
} from "@/test/order-fixtures";

import {
  getCategoryPriceTable,
  getProductPage,
  listCategoryTableProducts,
} from "./catalog-page.service";
import { getOrderDetail } from "./order-detail.service";
import { exportOrdersCsv } from "./order-export.service";
import { createProduct } from "./product.service";

/**
 * P1 (SEO.md §۴.۵–۴.۸): انتخاب ترکیب از پارامتر، جدول قیمت hub، سوییچ اندازه،
 * جعبه‌ی کپسول‌های خالی به تفکیک ترکیب، و چک ساعات کاری سمت سرور (ساعت ساختگی).
 */

const RUN = randomBytes(3).toString("hex");
const productIds: string[] = [];
const shippingIds: string[] = [];
let categoryId: string;
let catalog: Catalog;

const valve = {
  name: "نوع شیر",
  code: "valve",
  values: [
    { label: "پرسی", code: "persi" },
    { label: "بوتان", code: "butane" },
  ],
};

async function charge(size: string, persi: number, butane: number | null) {
  const result = await createProduct(
    productInputSchema.parse({
      name: `شارژ کپسول گاز ${RUN} ${toPersianDigits(size)} کیلویی`,
      slug: `p1-refill-${size}-${RUN}`,
      categoryId,
      kind: "SERVICE",
      sortOrder: Number(size),
      options: [valve],
      variants: [
        {
          selection: { valve: "persi" },
          price: persi,
          shippingWeightGrams: 27_000,
        },
        {
          selection: { valve: "butane" },
          price: butane ?? 0,
          shippingWeightGrams: 27_000,
          isActive: butane !== null,
        },
      ],
    }),
  );
  productIds.push(result.id);
  return result.id;
}

beforeAll(async () => {
  const category = await db.category.create({
    data: { name: `دسته P1 ${RUN}`, slug: `p1-cat-${RUN}` },
  });
  categoryId = category.id;
  catalog = await createCatalog();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await db.orderItem.deleteMany({ where: { productId: { in: productIds } } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.shippingMethod.deleteMany({ where: { id: { in: shippingIds } } });
  await db.category.delete({ where: { id: categoryId } });
  await cleanupFixtures();
});

describe("انتخاب ترکیب از پارامتر URL", () => {
  it("?valve=butane بوتان را با قیمت خودش انتخاب می‌کند؛ نامعتبر ⇒ پیش‌فرض", async () => {
    await charge("50", 38_000_000, 38_500_000);
    const lookup = await getProductPage(`p1-refill-50-${RUN}`);
    if (lookup.kind !== "found") throw new Error("not found");
    const product = lookup.data;
    expect(product.options.map((o) => o.code)).toEqual(["valve"]);
    expect(product.priceUpdatedAt).toBeInstanceOf(Date);

    const pick = (params: Record<string, string>) =>
      resolveSelected(
        product.variants,
        parseSelectionParams(params, product.options),
        product.options,
      );
    expect(pick({ valve: "butane" })?.price).toBe(38_500_000);
    expect(pick({ valve: "persi" })?.price).toBe(38_000_000);
    // پارامتر نامعتبر یا ناشناخته ⇒ اولین ترکیب فعال، بدون خطا
    expect(pick({ valve: "xyz" })?.selection).toEqual({ valve: "persi" });
    expect(pick({ nope: "1" })?.selection).toEqual({ valve: "persi" });
  });

  it("ترکیب غیرفعال انتخاب‌شدنی نیست و پارامترش نادیده گرفته می‌شود", async () => {
    await charge("33", 25_000_000, null);
    const lookup = await getProductPage(`p1-refill-33-${RUN}`);
    if (lookup.kind !== "found") throw new Error("not found");
    expect(lookup.data.variants.map((v) => v.selection.valve)).toEqual([
      "persi",
    ]);
    const selected = resolveSelected(
      lookup.data.variants,
      parseSelectionParams({ valve: "butane" }, lookup.data.options),
      lookup.data.options,
    );
    expect(selected?.selection).toEqual({ valve: "persi" });
  });
});

describe("جدول قیمت hub و سوییچ اندازه", () => {
  it("جدول: ردیف = محصول، ستون پرسی/بوتان، ترکیب غیرفعال «—»، لینک هر ردیف", async () => {
    await charge("11", 3_400_000, 3_400_000);
    await charge("25", 7_000_000, 7_100_000);
    const dto = await getCategoryPriceTable(categoryId);
    expect(dto).not.toBeNull();
    const { table } = dto!;
    expect(table.columns.map((c) => c.label)).toEqual(["پرسی", "بوتان"]);
    expect(table.rows.map((r) => r.href)).toEqual([
      `/products/p1-refill-11-${RUN}`,
      `/products/p1-refill-25-${RUN}`,
      `/products/p1-refill-33-${RUN}`,
      `/products/p1-refill-50-${RUN}`,
    ]);
    // ۳۳ فقط پرسی دارد ⇒ سلول بوتان خالی
    const row33 = table.rows[2]!;
    expect(row33.cells[0]?.price).toBe(25_000_000);
    expect(row33.cells[1]).toBeNull();
    expect(table.rows[3]!.cells[1]).toEqual({
      price: 38_500_000,
      href: `/products/p1-refill-50-${RUN}?valve=butane`,
    });
    expect(dto!.kind).toBe("SERVICE");
    expect(dto!.priceUpdatedAt).toBeInstanceOf(Date);
  });

  it("دسته‌ی تک‌محصولی جدول و سوییچ ندارد", async () => {
    const solo = await db.category.create({
      data: { name: `تک ${RUN}`, slug: `p1-solo-${RUN}` },
    });
    try {
      const product = await createProduct(
        productInputSchema.parse({
          name: `کپسول دست دوم ${RUN}`,
          slug: `p1-used-${RUN}`,
          categoryId: solo.id,
          variants: [{ price: 1_000_000, shippingWeightGrams: 15_000 }],
        }),
      );
      productIds.push(product.id);
      expect(await getCategoryPriceTable(solo.id)).toBeNull();
      const siblings = await listCategoryTableProducts(solo.id);
      expect(buildSizeSwitch(siblings, `p1-used-${RUN}`, {}).items).toEqual([]);
    } finally {
      await db.product.deleteMany({ where: { categoryId: solo.id } });
      await db.category.delete({ where: { id: solo.id } });
    }
  });

  it("سوییچ اندازه: لینک ۲۵ با حفظ ?valve=butane", async () => {
    const siblings = await listCategoryTableProducts(categoryId);
    const result = buildSizeSwitch(siblings, `p1-refill-11-${RUN}`, {
      valve: "butane",
    });
    expect(result.suffix).toBe("کیلویی");
    expect(result.items.map((item) => item.label)).toEqual([
      "۱۱",
      "۲۵",
      "۳۳",
      "۵۰",
    ]);
    const current = result.items.filter((item) => item.current);
    expect(current.map((item) => item.slug)).toEqual([`p1-refill-11-${RUN}`]);
    expect(result.items[1]!.href).toBe(
      `/products/p1-refill-25-${RUN}?valve=butane`,
    );
  });
});

describe("سفارش با ترکیب‌های جدا", () => {
  it("جعبه‌ی کپسول خالی و CSV ترکیب‌ها را جدا می‌شمارند", async () => {
    const lookup = await getProductPage(`p1-refill-11-${RUN}`);
    if (lookup.kind !== "found") throw new Error("not found");
    const persi = lookup.data.variants.find(
      (v) => v.selection.valve === "persi",
    )!;
    const butane = lookup.data.variants.find(
      (v) => v.selection.valve === "butane",
    )!;

    const customer = await createCustomer();
    await fillCart(customer, [
      [persi.id, 2],
      [butane.id, 1],
    ]);
    // پرسی + بوتان سرویس‌اند ⇒ پذیرش شرایط لازم است
    await placeOrder(customer, catalog.post, { acceptServiceTerms: true });
    const [order] = await ordersOf(customer.userId);

    const detail = await getOrderDetail(order!.id);
    const name = `شارژ کپسول گاز ${RUN} ۱۱ کیلویی`;
    expect(detail!.order.emptyCylinders).toEqual([
      { label: `${name} · پرسی`, quantity: 2 },
      { label: `${name} · بوتان`, quantity: 1 },
    ]);

    const csv = await exportOrdersCsv(
      parseOrderFilters({ q: order!.orderNumber }).filters,
    );
    expect(csv).toContain(`${name} · پرسی × 2`);
    expect(csv).toContain(`${name} · بوتان × 1`);
  });
});

describe("ارسال فوری: فقط در ساعات کاری (وقت تهران، ساعت ساختگی)", () => {
  async function express() {
    const method = await db.shippingMethod.create({
      data: {
        name: `فوری P1 ${RUN}`,
        cost: 150_000,
        businessHoursOnly: true,
        deliveryEstimate: "۱ تا ۴ ساعت",
      },
    });
    shippingIds.push(method.id);
    return method;
  }

  async function orderAt(iso: string) {
    const method = await express();
    const customer = await createCustomer();
    await fillCart(customer, [[catalog.small, 1]]);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
    return placeOrder(customer, method, { expectedGrandTotal: 550_000 });
  }

  it("خارج از ساعات کاری رد می‌شود (۰۲:۰۰ تهران)", async () => {
    await expect(orderAt("2026-10-01T22:30:00Z")).rejects.toThrow(
      "فقط در ساعات کاری (۹ تا ۱۸)",
    );
  });

  it("ساعت ۱۸:۰۰ تهران دیگر کاری نیست", async () => {
    await expect(orderAt("2026-10-02T14:30:00Z")).rejects.toThrow(
      "فقط در ساعات کاری",
    );
  });

  it("داخل ساعات کاری ثبت می‌شود (۱۰:۰۰ تهران)", async () => {
    const placed = await orderAt("2026-10-02T06:30:00Z");
    expect(placed.orderNumber).toBeTruthy();
  });
});
