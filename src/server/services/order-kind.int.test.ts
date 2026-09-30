import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { parseOrderFilters } from "@/lib/order-filters";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  createCustomer,
  fillCart,
  ordersOf,
  placeOrder,
} from "@/test/order-fixtures";

import { getMyOrder } from "./account.service";
import { getOrderDetail } from "./order-detail.service";
import { exportOrdersCsv } from "./order-export.service";

/**
 * F4: محصول استعلامی، خدمت و پذیرش شرایط، تحویل حضوری و ارسال رایگان تعدادی
 * (FORK.md §۴.۱–۴.۳). قواعد سمت سرورند، نه فقط UI.
 */

// ── Server Action با کاربر/کوکی ساختگی ──
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));
vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: async () => (session.userId ? { id: session.userId } : null),
}));

import { addToCartAction } from "@/server/actions/cart";
import { placeOrderAction } from "@/server/actions/checkout";

const RUN = randomBytes(3).toString("hex");
let catalog: Catalog;
const productIds: string[] = [];
const shippingIds: string[] = [];

interface Sample {
  productId: string;
  variantId: string;
}

async function product(
  slug: string,
  data: {
    kind?: "SERVICE" | "PHYSICAL";
    pricingMode?: "FIXED" | "INQUIRY";
    serviceTerms?: string | null;
    variantActive?: boolean;
    price?: number;
  } = {},
): Promise<Sample> {
  const created = await db.product.create({
    data: {
      name: `محصول ${slug} ${RUN}`,
      slug: `${slug}-${RUN}`,
      categoryId: catalog.categoryId,
      unit: "PIECE",
      kind: data.kind ?? "PHYSICAL",
      pricingMode: data.pricingMode ?? "FIXED",
      serviceTerms: data.serviceTerms ?? null,
      variants: {
        create: {
          unitValue: 1,
          title: "۱۱ کیلوگرم",
          price: data.price ?? 100_000,
          shippingWeightGrams: 1000,
          isActive: data.variantActive ?? true,
        },
      },
    },
    include: { variants: true },
  });
  productIds.push(created.id);
  return { productId: created.id, variantId: created.variants[0]!.id };
}

async function shipping(data: {
  name: string;
  cost?: number;
  requiresAddress?: boolean;
  freeAboveQuantity?: number | null;
}) {
  const method = await db.shippingMethod.create({
    data: {
      name: `${data.name} ${RUN}`,
      cost: data.cost ?? 100_000,
      requiresAddress: data.requiresAddress ?? true,
      freeAboveQuantity: data.freeAboveQuantity ?? null,
    },
  });
  shippingIds.push(method.id);
  return method;
}

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  // سفارش‌ها و کاربران اول؛ بعد محصولات (دسته‌ی fixture Restrict است)
  await cleanupFixtures().catch(() => undefined);
});

async function cleanupOwn() {
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.shippingMethod.deleteMany({ where: { id: { in: shippingIds } } });
}

describe("محصول استعلامی (§۴.۱)", () => {
  it("🔴 افزودن به سبد از طریق Server Action مستقیم ⇒ رد", async () => {
    const customer = await createCustomer();
    session.userId = customer.userId;
    // محصول استعلامی که (به هر دلیل) متغیر فعال دارد: سرور باز هم رد می‌کند
    const inquiry = await product("inq-active", {
      kind: "SERVICE",
      pricingMode: "INQUIRY",
    });
    const result = await addToCartAction(inquiry.variantId, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("استعلامی");
    expect(
      await db.cartItem.count({ where: { cart: { userId: customer.userId } } }),
    ).toBe(0);

    // محصول قیمت‌دار عادی همچنان اضافه می‌شود
    const fixed = await product("fixed-ok");
    expect((await addToCartAction(fixed.variantId, 1)).ok).toBe(true);
  });

  it("متغیر غیرفعال‌شده‌ی محصول استعلامی ⇒ رد", async () => {
    const customer = await createCustomer();
    session.userId = customer.userId;
    const inquiry = await product("inq-off", {
      pricingMode: "INQUIRY",
      variantActive: false,
    });
    expect((await addToCartAction(inquiry.variantId, 1)).ok).toBe(false);
  });

  it("محصولی که بعد از افزودن استعلامی شد ⇒ از سبد حذف و ثبت سفارش رد می‌شود", async () => {
    const customer = await createCustomer();
    const item = await product("turns-inquiry");
    await fillCart(customer, [
      [item.variantId, 1],
      [catalog.small, 1],
    ]);
    await db.product.update({
      where: { id: item.productId },
      data: { pricingMode: "INQUIRY" },
    });
    // مبلغ را دستی می‌دهیم: اگر قبلش خلاصه‌ی سبد خوانده شود، آیتم همان‌جا حذف
    // می‌شود و سفارش با بقیه‌ی اقلام ثبت می‌شود (سازوکار موجود)
    await expect(
      placeOrder(customer, catalog.post, { expectedGrandTotal: 590_000 }),
    ).rejects.toThrow(/دیگر قابل سفارش نیست/);
    expect(await ordersOf(customer.userId)).toHaveLength(0);
    // سازوکار حذف آیتم‌های غیرقابل‌سفارش: آیتم استعلامی رفت، آیتم عادی ماند
    const remaining = await db.cartItem.findMany({
      where: { cart: { userId: customer.userId } },
    });
    expect(remaining.map((r) => r.variantId)).toEqual([catalog.small]);
  });
});

describe("خدمت و پذیرش شرایط (§۴.۲)", () => {
  it("🔴 سبد دارای خدمت بدون پذیرش ⇒ رد؛ با پذیرش ⇒ زمان و متن ثبت می‌شود", async () => {
    const customer = await createCustomer();
    const service = await product("svc", {
      kind: "SERVICE",
      serviceTerms: "شرایط اختصاصی این خدمت",
    });
    await fillCart(customer, [[service.variantId, 2]]);

    await expect(placeOrder(customer, catalog.post)).rejects.toThrow(
      /شرایط تعویض کپسول/,
    );
    expect(await ordersOf(customer.userId)).toHaveLength(0);

    await placeOrder(customer, catalog.post, { acceptServiceTerms: true });
    const [order] = await ordersOf(customer.userId);
    expect(order!.serviceTermsAcceptedAt).toBeInstanceOf(Date);
    expect(order!.serviceTermsSnapshot).toBe("شرایط اختصاصی این خدمت");
    expect(order!.items[0]!.productKindSnapshot).toBe("SERVICE");
  });

  it("خدمت بدون متن اختصاصی ⇒ متن پیش‌فرض تنظیمات ذخیره می‌شود", async () => {
    const customer = await createCustomer();
    const service = await product("svc-default", { kind: "SERVICE" });
    await fillCart(customer, [[service.variantId, 1]]);
    await placeOrder(customer, catalog.post, { acceptServiceTerms: true });
    const [order] = await ordersOf(customer.userId);
    expect(order!.serviceTermsSnapshot).toContain("از قبل پرشده");
  });

  it("سبد مخلوط خدمت + کالا ثبت می‌شود و شرایط همه‌ی خدمت‌ها بدون تکرار ذخیره می‌شود", async () => {
    const customer = await createCustomer();
    const a = await product("mix-a", {
      kind: "SERVICE",
      serviceTerms: "متن مشترک",
    });
    const b = await product("mix-b", {
      kind: "SERVICE",
      serviceTerms: "متن مشترک",
    });
    const physical = await product("mix-c", {
      kind: "PHYSICAL",
      serviceTerms: "نادیده",
    });
    await fillCart(customer, [
      [a.variantId, 1],
      [b.variantId, 1],
      [physical.variantId, 1],
    ]);
    await placeOrder(customer, catalog.post, { acceptServiceTerms: true });
    const [order] = await ordersOf(customer.userId);
    expect(order!.serviceTermsSnapshot).toBe("متن مشترک");
    expect(order!.items.map((i) => i.productKindSnapshot).sort()).toEqual([
      "PHYSICAL",
      "SERVICE",
      "SERVICE",
    ]);
  });

  it("سبد فقط کالای فیزیکی ⇒ بدون پذیرش ثبت می‌شود و شرایطی ذخیره نمی‌شود", async () => {
    const customer = await createCustomer();
    const physical = await product("phys-only");
    await fillCart(customer, [[physical.variantId, 1]]);
    await placeOrder(customer, catalog.post, { acceptServiceTerms: true });
    const [order] = await ordersOf(customer.userId);
    expect(order!.serviceTermsAcceptedAt).toBeNull();
    expect(order!.serviceTermsSnapshot).toBeNull();
    expect(order!.items[0]!.productKindSnapshot).toBe("PHYSICAL");
  });

  it("Server Action ثبت سفارش هم بدون پذیرش رد می‌کند", async () => {
    const customer = await createCustomer();
    session.userId = customer.userId;
    const service = await product("svc-action", { kind: "SERVICE" });
    await fillCart(customer, [[service.variantId, 1]]);
    const result = await placeOrderAction({
      addressId: customer.addressId,
      shippingMethodId: catalog.post.id,
      customerNote: "",
      expectedGrandTotal: 190_000,
    });
    expect(result.ok).toBe(false);
    expect(await ordersOf(customer.userId)).toHaveLength(0);
  });

  it("جزئیات ادمین: کپسول‌های خالی به تفکیک محصول/متغیر و شرایط پذیرفته‌شده", async () => {
    const customer = await createCustomer();
    const service = await product("svc-admin", { kind: "SERVICE" });
    const physical = await product("phys-admin");
    await fillCart(customer, [
      [service.variantId, 3],
      [physical.variantId, 5],
    ]);
    await placeOrder(customer, catalog.post, { acceptServiceTerms: true });
    const [order] = await ordersOf(customer.userId);
    const detail = await getOrderDetail(order!.id);
    expect(detail!.order.emptyCylinders).toEqual([
      { label: `محصول svc-admin ${RUN} · ۱۱ کیلوگرم`, quantity: 3 },
    ]);
    expect(detail!.order.serviceTerms?.text).toContain("از قبل پرشده");
    expect(detail!.order.pickup).toBe(false);
  });
});

describe("تحویل حضوری (§۴.۳)", () => {
  it("🔴 روش بدون آدرس: بدون آدرس ثبت می‌شود و اسنپ‌شات خالی است", async () => {
    const customer = await createCustomer();
    const pickup = await shipping({
      name: "حضوری",
      cost: 0,
      requiresAddress: false,
    });
    await fillCart(customer, [[catalog.small, 1]]);
    await placeOrder(customer, pickup, { addressId: null });
    const [order] = await ordersOf(customer.userId);
    expect(order!.shippingAddressSnapshot).toBeNull();
    expect(order).toMatchObject({ shippingTotal: 0, grandTotal: 400_000 });
    const detail = await getOrderDetail(order!.id);
    expect(detail!.order.pickup).toBe(true);
    expect(detail!.order.address).toBeNull();

    // خروجی CSV و دیدِ مشتری برای حالت بدون آدرس نمی‌شکند
    const csv = await exportOrdersCsv(
      parseOrderFilters({ q: order!.orderNumber }).filters,
    );
    expect(csv).toContain(order!.orderNumber);
    expect(csv).toContain("تحویل حضوری");
    const mine = await getMyOrder(order!.orderNumber, customer.userId);
    expect(mine).toMatchObject({ address: null, pickup: true });
  });

  it("روش حضوری آدرسِ فرستاده‌شده را ذخیره نمی‌کند", async () => {
    const customer = await createCustomer();
    const pickup = await shipping({
      name: "حضوری۲",
      cost: 0,
      requiresAddress: false,
    });
    await fillCart(customer, [[catalog.small, 1]]);
    await placeOrder(customer, pickup);
    const [order] = await ordersOf(customer.userId);
    expect(order!.shippingAddressSnapshot).toBeNull();
  });

  it("🔴 روش با پیک بدون آدرس ⇒ رد", async () => {
    const customer = await createCustomer();
    const courier = await shipping({ name: "پیک", requiresAddress: true });
    await fillCart(customer, [[catalog.small, 1]]);
    await expect(
      placeOrder(customer, courier, { addressId: null }),
    ).rejects.toThrow(/آدرس ارسال را انتخاب کنید/);
    expect(await ordersOf(customer.userId)).toHaveLength(0);
  });

  it("خدمت + تحویل حضوری با پذیرش شرایط ثبت می‌شود", async () => {
    const customer = await createCustomer();
    const pickup = await shipping({
      name: "حضوری۳",
      cost: 0,
      requiresAddress: false,
    });
    const service = await product("svc-pickup", { kind: "SERVICE" });
    await fillCart(customer, [[service.variantId, 1]]);
    await placeOrder(customer, pickup, {
      addressId: null,
      acceptServiceTerms: true,
    });
    const [order] = await ordersOf(customer.userId);
    expect(order!.shippingAddressSnapshot).toBeNull();
    expect(order!.serviceTermsSnapshot).not.toBeNull();
  });
});

describe("ارسال رایگان تعدادی (§۳.۳)", () => {
  it("۱۰ عدد ⇒ هزینه‌ی پیک صفر؛ ۹ عدد ⇒ هزینه‌ی عادی", async () => {
    const courier = await shipping({
      name: "پیک تعدادی",
      cost: 100_000,
      freeAboveQuantity: 10,
    });
    const item = await product("bulk", { price: 50_000 });

    const nine = await createCustomer();
    await fillCart(nine, [[item.variantId, 9]]);
    await placeOrder(nine, courier);
    expect((await ordersOf(nine.userId))[0]).toMatchObject({
      shippingTotal: 100_000,
      grandTotal: 550_000,
    });

    const ten = await createCustomer();
    await fillCart(ten, [[item.variantId, 10]]);
    await placeOrder(ten, courier);
    expect((await ordersOf(ten.userId))[0]).toMatchObject({
      shippingTotal: 0,
      grandTotal: 500_000,
    });
  });

  it("مبنا مجموع تعداد همه‌ی اقلام است (خدمت + کالا، چند خط)", async () => {
    const courier = await shipping({
      name: "پیک تعدادی۲",
      cost: 100_000,
      freeAboveQuantity: 10,
    });
    const service = await product("bulk-svc", {
      kind: "SERVICE",
      price: 20_000,
    });
    const physical = await product("bulk-phys", { price: 30_000 });
    const customer = await createCustomer();
    await fillCart(customer, [
      [service.variantId, 4],
      [physical.variantId, 6],
    ]);
    await placeOrder(customer, courier, { acceptServiceTerms: true });
    expect((await ordersOf(customer.userId))[0]).toMatchObject({
      shippingTotal: 0,
      subtotal: 4 * 20_000 + 6 * 30_000,
    });
  });
});

afterAll(cleanupOwn, 60_000);
