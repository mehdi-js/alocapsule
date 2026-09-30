import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { productInputSchema } from "@/lib/validation/product";
import { createOrderRecord } from "@/server/repositories/order.repository";

import {
  CANNOT_ACTIVATE_MESSAGE,
  changeProductActive,
  createProduct,
  updateProduct,
} from "./product.service";
import { listProducts, parseProductListParams } from "./product-query.service";

/**
 * نوع محصول و حالت قیمت (FORK.md §۳.۲): استعلامی بدون متغیر، تغییر حالت
 * متغیرها را غیرفعال می‌کند (نه حذف)، قاعده‌ی فعال شدن، و ستون‌های جدید سفارش
 * (آدرس خالی، شرایط خدمت، اسنپ‌شات نوع محصول).
 */

const RUN = randomBytes(3).toString("hex");
let categoryId = "";
const productIds: string[] = [];
const userIds: string[] = [];

/** گروه گزینه‌ی «اندازه» (۱۱/۲۵/۳۳)؛ هر ترکیب یک variant با قیمت مستقل */
const SIZE_OPTION = {
  name: "اندازه",
  code: "size",
  values: [
    { label: "۱۱ کیلویی", code: "11" },
    { label: "۲۵ کیلویی", code: "25" },
    { label: "۳۳ کیلویی", code: "33" },
  ],
};

const variant = (size: number, price: number) => ({
  selection: { size: String(size) },
  price,
  shippingWeightGrams: size * 1000,
});

function input(slug: string, extra: Record<string, unknown> = {}) {
  return productInputSchema.parse({
    name: `محصول ${slug}`,
    slug: `${slug}-${RUN}`,
    categoryId,
    options: [SIZE_OPTION],
    variants: [variant(11, 800_000), variant(25, 2_200_000)],
    ...extra,
  });
}

async function track(result: { id: string }) {
  productIds.push(result.id);
  return db.product.findUniqueOrThrow({
    where: { id: result.id },
    include: { variants: { orderBy: { optionKey: "asc" } } },
  });
}

beforeAll(async () => {
  categoryId = (
    await db.category.create({
      data: {
        name: `دسته‌ی نوع محصول ${RUN}`,
        slug: `kind-cat-${RUN}`,
        isActive: false,
      },
    })
  ).id;
});

afterAll(async () => {
  await db.orderItem.deleteMany({
    where: { order: { userId: { in: userIds } } },
  });
  await db.order.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.slugHistory.deleteMany({ where: { entityId: { in: productIds } } });
  await db.category.deleteMany({ where: { id: categoryId } });
});

describe("ساخت محصول", () => {
  it("پیش‌فرض: کالای فیزیکی و قیمت‌دار با متغیرها", async () => {
    const product = await track(await createProduct(input("physical")));
    expect(product).toMatchObject({
      kind: "PHYSICAL",
      pricingMode: "FIXED",
      serviceTerms: null,
      isActive: true,
    });
    expect(product.variants).toHaveLength(2);
  });

  it("خدمت قیمت‌دار: متن شرایط ذخیره و HTML آن حذف می‌شود", async () => {
    const product = await track(
      await createProduct(
        input("service", {
          kind: "SERVICE",
          serviceTerms: "شرط اول <script>x()</script> و <b>دوم</b>",
        }),
      ),
    );
    expect(product.kind).toBe("SERVICE");
    expect(product.serviceTerms).toBe("شرط اول  و دوم");
  });

  it("استعلامی: متغیرِ ورودی نادیده گرفته می‌شود و محصول فعال است", async () => {
    const product = await track(
      await createProduct(
        input("inquiry", { kind: "SERVICE", pricingMode: "INQUIRY" }),
      ),
    );
    expect(product).toMatchObject({ pricingMode: "INQUIRY", isActive: true });
    expect(product.variants).toHaveLength(0);
  });

  it("قیمت‌دار با متغیر غیرفعال ⇒ نمی‌تواند فعال ساخته شود", async () => {
    const inactive = {
      ...variant(11, 800_000),
      isActive: false,
    };
    await expect(
      createProduct(input("cannot", { variants: [inactive], isActive: true })),
    ).rejects.toThrow(CANNOT_ACTIVATE_MESSAGE);
    // بدون درخواست صریح فعال‌سازی ⇒ غیرفعال ساخته می‌شود
    const product = await track(
      await createProduct(input("draft", { variants: [inactive] })),
    );
    expect(product.isActive).toBe(false);
  });
});

describe("تغییر حالت قیمت", () => {
  it("قیمت‌دار ⇒ استعلامی: متغیرها غیرفعال می‌شوند، حذف نمی‌شوند", async () => {
    const created = await track(await createProduct(input("to-inquiry")));
    const result = await updateProduct(
      created.id,
      input("to-inquiry", { pricingMode: "INQUIRY", variants: [] }),
    );
    expect(result.deactivatedVariants).toBe(2);

    const product = await track(result);
    expect(product.pricingMode).toBe("INQUIRY");
    expect(product.variants).toHaveLength(2);
    expect(product.variants.every((v) => !v.isActive)).toBe(true);
    expect(product.variants.map((v) => v.price)).toEqual([800_000, 2_200_000]);
  });

  it("استعلامی ⇒ قیمت‌دار: متغیرهای فرم ساخته می‌شوند", async () => {
    const created = await track(
      await createProduct(input("to-fixed", { pricingMode: "INQUIRY" })),
    );
    const result = await updateProduct(
      created.id,
      input("to-fixed", { variants: [variant(33, 2_450_000)] }),
    );
    expect(result.deactivatedVariants).toBe(0);
    const product = await track(result);
    expect(product.pricingMode).toBe("FIXED");
    expect(product.variants.map((v) => v.optionKey)).toEqual(["size:33"]);
  });

  it("ذخیره‌ی دوباره‌ی استعلامی چیزی حذف نمی‌کند", async () => {
    const created = await track(await createProduct(input("resave")));
    await updateProduct(
      created.id,
      input("resave", { pricingMode: "INQUIRY", variants: [] }),
    );
    const again = await updateProduct(
      created.id,
      input("resave", { pricingMode: "INQUIRY", variants: [] }),
    );
    expect(again.deactivatedVariants).toBe(0);
    expect((await track(again)).variants).toHaveLength(2);
  });
});

describe("فعال‌سازی", () => {
  it("قیمت‌دار بدون متغیر فعال ⇒ رد؛ استعلامی همیشه قابل فعال شدن", async () => {
    const fixed = await track(await createProduct(input("act-fixed")));
    await db.productVariant.updateMany({
      where: { productId: fixed.id },
      data: { isActive: false },
    });
    await db.product.update({
      where: { id: fixed.id },
      data: { isActive: false },
    });
    await expect(changeProductActive(fixed.id, true)).rejects.toThrow(
      CANNOT_ACTIVATE_MESSAGE,
    );

    await db.productVariant.updateMany({
      where: { productId: fixed.id },
      data: { isActive: true },
    });
    await changeProductActive(fixed.id, true);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: fixed.id } }))
        .isActive,
    ).toBe(true);

    const inquiry = await track(
      await createProduct(input("act-inq", { pricingMode: "INQUIRY" })),
    );
    await db.product.update({
      where: { id: inquiry.id },
      data: { isActive: false },
    });
    await changeProductActive(inquiry.id, true);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: inquiry.id } }))
        .isActive,
    ).toBe(true);
  });
});

describe("ستون‌های جدید سفارش", () => {
  let sample: Awaited<ReturnType<typeof track>>;

  beforeAll(async () => {
    sample = await track(await createProduct(input("order-item")));
  });

  async function order(extra: Record<string, unknown>, kind?: "SERVICE") {
    const user = await db.user.create({
      data: { phone: `0999${randomBytes(3).readUIntBE(0, 3)}`.slice(0, 11) },
    });
    userIds.push(user.id);
    const created = await db.$transaction((tx) =>
      createOrderRecord(
        tx,
        {
          orderNumber: `TS-14050101-${randomBytes(3).toString("hex")}`,
          userId: user.id,
          subtotal: 800_000,
          shippingTotal: 0,
          discountTotal: 0,
          grandTotal: 800_000,
          couponId: null,
          couponCode: null,
          shippingMethodName: "تحویل حضوری",
          shippingPayOnDelivery: false,
          shippingAddressSnapshot: null,
          customerNote: null,
          ...extra,
        },
        [
          {
            variantId: sample.variants[0]!.id,
            productId: sample.id,
            productName: "نمونه",
            variantTitle: "۱۱ کیلوگرم",
            unitPrice: 800_000,
            quantity: 1,
            lineTotal: 800_000,
            unitValueSnapshot: 11_000,
            unitSnapshot: "GRAM",
            ...(kind ? { productKindSnapshot: kind } : {}),
          },
        ],
      ),
    );
    return db.order.findUniqueOrThrow({
      where: { id: created.id },
      include: { items: true },
    });
  }

  it("تحویل حضوری: آدرس خالی (NULL) و شرایط خدمت ذخیره می‌شود", async () => {
    const acceptedAt = new Date("2026-09-30T10:00:00Z");
    const saved = await order(
      {
        serviceTermsAcceptedAt: acceptedAt,
        serviceTermsSnapshot: "متن شرایط پذیرفته‌شده",
      },
      "SERVICE",
    );
    expect(saved.shippingAddressSnapshot).toBeNull();
    expect(saved.serviceTermsAcceptedAt).toEqual(acceptedAt);
    expect(saved.serviceTermsSnapshot).toBe("متن شرایط پذیرفته‌شده");
    expect(saved.items[0]!.productKindSnapshot).toBe("SERVICE");
  });

  it("پیش‌فرض: بدون شرایط و اسنپ‌شات نوع = فیزیکی", async () => {
    const saved = await order({});
    expect(saved.serviceTermsAcceptedAt).toBeNull();
    expect(saved.serviceTermsSnapshot).toBeNull();
    expect(saved.items[0]!.productKindSnapshot).toBe("PHYSICAL");
  });

  it("سفارش با آدرس همچنان JSON ذخیره می‌کند", async () => {
    const saved = await order({
      shippingAddressSnapshot: { receiverName: "مریم", city: "تهران" },
    });
    expect(saved.shippingAddressSnapshot).toMatchObject({
      receiverName: "مریم",
    });
  });
});

describe("لیست ادمین: فیلتر نوع و حالت قیمت", () => {
  it("فیلتر روی kind و pricingMode و ستون‌ها در خروجی", async () => {
    const physical = await track(await createProduct(input("list-phys")));
    const service = await track(
      await createProduct(input("list-svc", { kind: "SERVICE" })),
    );
    const inquiry = await track(
      await createProduct(
        input("list-inq", { kind: "SERVICE", pricingMode: "INQUIRY" }),
      ),
    );
    const base = { q: "", categoryId, status: "all" as const, page: 1 };
    const names = async (
      kind: "" | "PHYSICAL" | "SERVICE",
      pricing: "" | "FIXED" | "INQUIRY",
    ) =>
      (await listProducts({ ...base, kind, pricingMode: pricing })).items
        .map((item) => item.id)
        .filter((id) => [physical.id, service.id, inquiry.id].includes(id))
        .sort();

    expect(await names("", "")).toEqual(
      [physical.id, service.id, inquiry.id].sort(),
    );
    expect(await names("SERVICE", "")).toEqual([service.id, inquiry.id].sort());
    expect(await names("PHYSICAL", "")).toEqual([physical.id]);
    expect(await names("", "INQUIRY")).toEqual([inquiry.id]);
    expect(await names("SERVICE", "FIXED")).toEqual([service.id]);

    const row = (
      await listProducts({ ...base, kind: "", pricingMode: "INQUIRY" })
    ).items.find((item) => item.id === inquiry.id);
    expect(row).toMatchObject({
      kind: "SERVICE",
      pricingMode: "INQUIRY",
      variantCount: 0,
    });
  });

  it("پارامتر نامعتبر URL ⇒ بدون فیلتر", () => {
    expect(parseProductListParams({ kind: "GAS", pricing: "x" })).toMatchObject(
      {
        kind: "",
        pricingMode: "",
      },
    );
    expect(
      parseProductListParams({ kind: "SERVICE", pricing: "INQUIRY" }),
    ).toMatchObject({ kind: "SERVICE", pricingMode: "INQUIRY" });
  });
});
