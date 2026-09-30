import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { listCatalogProducts, parseCatalogQuery } from "./catalog.service";
import {
  getProductPage,
  getProductShippingInfo,
  listFeaturedCategories,
} from "./catalog-page.service";

/**
 * F6: نمایش عمومی محصول خدمت و استعلامی (کارت، لیست، صفحه‌ی محصول، اطلاعات
 * ارسال، دسته‌های صفحه‌ی اصلی).
 */

const RUN = randomBytes(3).toString("hex");
let categoryId = "";
const ids = { fixed: "", service: "", inquiry: "" };
const shippingIds: string[] = [];

beforeAll(async () => {
  const category = await db.category.create({
    data: {
      name: `دسته‌ی نمایش ${RUN}`,
      slug: `show-cat-${RUN}`,
      isFeatured: true,
    },
  });
  categoryId = category.id;
  const make = async (
    key: keyof typeof ids,
    data: {
      kind: "PHYSICAL" | "SERVICE";
      pricingMode: "FIXED" | "INQUIRY";
      price?: number;
    },
  ) => {
    const product = await db.product.create({
      data: {
        name: `محصول ${key} ${RUN}`,
        slug: `show-${key}-${RUN}`,
        categoryId,
        unit: "PIECE",
        kind: data.kind,
        pricingMode: data.pricingMode,
        variants: data.price
          ? {
              create: {
                unitValue: 1,
                price: data.price,
                shippingWeightGrams: 1000,
              },
            }
          : undefined,
      },
    });
    ids[key] = product.id;
  };
  await make("fixed", {
    kind: "PHYSICAL",
    pricingMode: "FIXED",
    price: 500_000,
  });
  await make("service", {
    kind: "SERVICE",
    pricingMode: "FIXED",
    price: 300_000,
  });
  await make("inquiry", { kind: "SERVICE", pricingMode: "INQUIRY" });
});

afterAll(async () => {
  await db.product.deleteMany({ where: { categoryId } });
  await db.category.deleteMany({ where: { id: categoryId } });
  await db.shippingMethod.deleteMany({ where: { id: { in: shippingIds } } });
});

const query = (params: Record<string, string> = {}) =>
  parseCatalogQuery({ category: `show-cat-${RUN}`, ...params });

describe("لیست فروشگاه", () => {
  it("استعلامی هم می‌آید: قیمت null، نوع خدمت؛ قیمت‌دار قیمت دارد", async () => {
    const { items } = await listCatalogProducts(query());
    const byId = new Map(items.map((item) => [item.id, item]));
    expect(byId.get(ids.fixed)).toMatchObject({
      kind: "PHYSICAL",
      pricingMode: "FIXED",
      price: 500_000,
    });
    expect(byId.get(ids.service)).toMatchObject({
      kind: "SERVICE",
      pricingMode: "FIXED",
      price: 300_000,
    });
    expect(byId.get(ids.inquiry)).toMatchObject({
      kind: "SERVICE",
      pricingMode: "INQUIRY",
      price: null,
      variants: [],
    });
  });

  it("فیلتر قیمت فقط قیمت‌دارها را می‌گیرد", async () => {
    const { items } = await listCatalogProducts(query({ min: "400000" }));
    expect(items.map((item) => item.id)).toEqual([ids.fixed]);
  });

  it("مرتب‌سازی قیمت: استعلامی همیشه آخر لیست", async () => {
    for (const sort of ["cheapest", "expensive"]) {
      const { items } = await listCatalogProducts(query({ sort }));
      expect(items.at(-1)?.id).toBe(ids.inquiry);
    }
    const cheapest = await listCatalogProducts(query({ sort: "cheapest" }));
    expect(cheapest.items.map((item) => item.id)).toEqual([
      ids.service,
      ids.fixed,
      ids.inquiry,
    ]);
  });
});

describe("صفحه‌ی محصول", () => {
  it("استعلامی: قابل نمایش، بدون متغیر و بدون قیمت برای schema", async () => {
    const lookup = await getProductPage(`show-inquiry-${RUN}`);
    expect(lookup.kind).toBe("found");
    if (lookup.kind !== "found") return;
    expect(lookup.data).toMatchObject({
      kind: "SERVICE",
      pricingMode: "INQUIRY",
      available: true,
      variants: [],
      schemaVariants: [],
    });
  });

  it("استعلامی با متغیر غیرفعالِ قدیمی: باز هم بدون قیمت (قیمت ساختگی ممنوع)", async () => {
    await db.productVariant.create({
      data: {
        productId: ids.inquiry,
        unitValue: 7,
        price: 123_000,
        shippingWeightGrams: 1,
        isActive: false,
      },
    });
    const lookup = await getProductPage(`show-inquiry-${RUN}`);
    if (lookup.kind !== "found") throw new Error("missing");
    expect(lookup.data.variants).toEqual([]);
    expect(lookup.data.schemaVariants).toEqual([]);
  });

  it("خدمت قیمت‌دار: متغیر و نوع در DTO", async () => {
    const lookup = await getProductPage(`show-service-${RUN}`);
    if (lookup.kind !== "found") throw new Error("missing");
    expect(lookup.data).toMatchObject({
      kind: "SERVICE",
      pricingMode: "FIXED",
      available: true,
    });
    expect(lookup.data.variants).toHaveLength(1);
  });
});

describe("داده‌ی صفحه‌ی اصلی و ردیف اطلاعات", () => {
  it("دسته‌های دارای پرچم isFeatured از دیتابیس", async () => {
    const featured = await listFeaturedCategories();
    expect(featured.map((c) => c.path)).toContain(`/category/show-cat-${RUN}`);
    await db.category.update({
      where: { id: categoryId },
      data: { isFeatured: false },
    });
    const after = await listFeaturedCategories();
    expect(after.map((c) => c.path)).not.toContain(`/category/show-cat-${RUN}`);
  });

  it("اطلاعات ارسال از روش‌های فعال؛ غیرفعال‌کردن یک روش آن را حذف می‌کند", async () => {
    const courier = await db.shippingMethod.create({
      data: {
        name: `پیک نمایش ${RUN}`,
        cost: 50_000,
        freeAboveQuantity: 3,
        deliveryEstimate: "۱ تا ۴ ساعت",
      },
    });
    const pickup = await db.shippingMethod.create({
      data: { name: `حضوری نمایش ${RUN}`, cost: 0, requiresAddress: false },
    });
    shippingIds.push(courier.id, pickup.id);

    const texts = (await getProductShippingInfo("۹ تا ۱۸")).map((i) => i.text);
    expect(texts).toContain(
      `${courier.name}: ۱ تا ۴ ساعت · هزینه ۵۰,۰۰۰ تومان`,
    );
    expect(texts).toContain(`${pickup.name}: ۹ تا ۱۸`);
    expect(texts).toContain(`${courier.name} رایگان از ۳ عدد به بالا`);

    await db.shippingMethod.update({
      where: { id: courier.id },
      data: { isActive: false },
    });
    const after = (await getProductShippingInfo("۹ تا ۱۸")).map((i) => i.text);
    expect(after.some((text) => text.includes(courier.name))).toBe(false);
    expect(after).toContain(`${pickup.name}: ۹ تا ۱۸`);
  });
});
