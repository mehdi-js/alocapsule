import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  computeFilledPrices,
  DIFFERENT_CHARGE_PRICES_MESSAGE,
} from "@/lib/product-options";
import { productInputSchema } from "@/lib/validation/product";
import { shippingMethodSchema } from "@/lib/validation/settings";
import {
  cleanupFixtures,
  createAdmin,
  createCatalog,
  createCustomer,
  fillCart,
  ordersOf,
  placeOrder,
} from "@/test/order-fixtures";

import {
  changeVariantActive,
  createProduct,
  updateProduct,
} from "./product.service";
import { duplicateProduct } from "./product-duplicate.service";
import { getProductForEdit } from "./product-query.service";
import { saveShippingMethod } from "./store-settings.service";

/**
 * معیارهای فاز P0 (SEO.md §۴.۳، §۴.۴، §۱۲): مدل گزینه‌ها و ترکیب‌ها، قیمت
 * پرشده، محصول متناظر، کپی محصول، قفل کدها، اسنپ‌شات گزینه‌ها در سفارش.
 */

const RUN = randomBytes(3).toString("hex");
const productIds: string[] = [];
const shippingIds: string[] = [];
let categoryId: string;
let adminId: string;
let catalogCleanup = false;

const valve = {
  name: "نوع شیر",
  code: "valve",
  values: [
    { label: "پرسی", code: "persi" },
    { label: "بوتان", code: "butane" },
  ],
};
const fill = {
  name: "وضعیت تحویل",
  code: "fill",
  values: [
    { label: "خالی", code: "empty" },
    { label: "پرشده", code: "filled" },
  ],
};

function input(slug: string, extra: Record<string, unknown> = {}) {
  return productInputSchema.parse({
    name: `محصول ${slug} ${RUN}`,
    slug: `${slug}-${RUN}`,
    categoryId,
    ...extra,
  });
}

const combo = (
  selection: Record<string, string>,
  price: number,
  extra: Record<string, unknown> = {},
) => ({
  selection,
  price,
  shippingWeightGrams: price > 0 ? 11_000 : 0,
  ...extra,
});

async function make(slug: string, extra: Record<string, unknown> = {}) {
  const result = await createProduct(input(slug, extra));
  productIds.push(result.id);
  return result.id;
}

async function variantsOf(id: string) {
  return db.productVariant.findMany({
    where: { productId: id },
    orderBy: { optionKey: "asc" },
  });
}

/** فرم ویرایش را از DTO بازسازی می‌کند (مثل ادمینی که فقط چیزی عوض می‌کند) */
async function resubmit(
  id: string,
  mutate: (raw: Record<string, unknown>) => void,
) {
  const dto = await getProductForEdit(id);
  if (!dto) throw new Error("not found");
  const raw: Record<string, unknown> = {
    name: dto.name,
    slug: dto.slug,
    categoryId: dto.categoryId,
    pairedProductId: dto.paired?.id ?? null,
    options: dto.options.map((option) => ({
      id: option.id,
      name: option.name,
      code: option.code,
      values: option.values.map((value) => ({
        id: value.id,
        label: value.label,
        code: value.code,
        isActive: value.isActive,
      })),
    })),
    variants: dto.variants.map((variant) => ({
      id: variant.id,
      selection: variant.selection,
      price: variant.price,
      shippingWeightGrams: variant.shippingWeightGrams,
      isActive: variant.isActive,
    })),
  };
  mutate(raw);
  return updateProduct(id, productInputSchema.parse(raw));
}

beforeAll(async () => {
  const category = await db.category.create({
    data: { name: `دسته P0 ${RUN}`, slug: `p0-cat-${RUN}` },
  });
  categoryId = category.id;
  adminId = await createAdmin();
  catalogCleanup = true;
});

afterAll(async () => {
  await db.product.updateMany({
    where: { id: { in: productIds } },
    data: { pairedProductId: null },
  });
  await db.orderItem.deleteMany({ where: { productId: { in: productIds } } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.shippingMethod.deleteMany({ where: { id: { in: shippingIds } } });
  await db.category.delete({ where: { id: categoryId } });
  if (catalogCleanup) await cleanupFixtures();
});

describe("ساخت محصول با گزینه‌ها (معیار تکمیل: ۱۱، ۱۱ خرید، دست دوم)", () => {
  it("شارژ ۱۱: دو ترکیب پرسی/بوتان با عنوان و کلید خودکار", async () => {
    const id = await make("charge-11", {
      options: [valve],
      variants: [
        combo({ valve: "persi" }, 3_400_000),
        combo({ valve: "butane" }, 3_400_000),
      ],
    });
    const variants = await variantsOf(id);
    expect(variants.map((v) => v.optionKey)).toEqual([
      "valve:butane",
      "valve:persi",
    ]);
    expect(variants.map((v) => v.title).sort()).toEqual(["بوتان", "پرسی"]);
    expect(variants.every((v) => v.unitValue === null)).toBe(true);
  });

  it("خرید ۱۱ (خالی/پرشده) و دست‌دوم ۸ ترکیبی ساخته می‌شود", async () => {
    const buy = await make("buy-11", {
      options: [fill],
      variants: [
        combo({ fill: "empty" }, 3_400_000),
        combo({ fill: "filled" }, 0, { isActive: false }),
      ],
    });
    expect(await variantsOf(buy)).toHaveLength(2);

    const used = await make("used", {
      options: [
        {
          name: "اندازه",
          code: "size",
          values: [
            { label: "۱۱", code: "11" },
            { label: "۲۵", code: "25" },
          ],
        },
        valve,
        {
          name: "وضعیت",
          code: "state",
          values: [
            { label: "سالم", code: "good" },
            { label: "فرسوده", code: "worn" },
          ],
        },
      ],
      variants: ["11", "25"].flatMap((size) =>
        ["persi", "butane"].flatMap((v) =>
          ["good", "worn"].map((state) =>
            combo({ size, valve: v, state }, 1_000_000),
          ),
        ),
      ),
    });
    const variants = await variantsOf(used);
    expect(variants).toHaveLength(8);
    expect(new Set(variants.map((v) => v.optionKey)).size).toBe(8);
  });

  it("ذخیره‌ی دوباره (مثل «ساخت همه‌ی ترکیب‌ها») ترکیب تکراری نمی‌سازد", async () => {
    const id = await make("no-dup", {
      options: [valve],
      variants: [combo({ valve: "persi" }, 100_000)],
    });
    // ادمین مقدار «بوتان» را هم دارد ولی ترکیبش هنوز نیست ⇒ ساخته می‌شود
    await resubmit(id, (raw) => {
      (raw.variants as unknown[]).push(
        combo({ valve: "butane" }, 0, { isActive: false }),
      );
    });
    expect(await variantsOf(id)).toHaveLength(2);
    await resubmit(id, () => undefined);
    await resubmit(id, () => undefined);
    expect(await variantsOf(id)).toHaveLength(2);
  });

  it("ترکیب دوباره در ورودی (کلید تکراری) رد می‌شود", async () => {
    await expect(
      createProduct(
        input("dup-key", {
          options: [valve],
          variants: [
            combo({ valve: "persi" }, 1000),
            combo({ valve: "persi" }, 2000),
          ],
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("قیمت و فعال‌سازی", () => {
  it("ترکیب بدون قیمت فعال نمی‌شود؛ با قیمت می‌شود", async () => {
    const id = await make("priceless", {
      options: [valve],
      variants: [
        combo({ valve: "persi" }, 100_000),
        combo({ valve: "butane" }, 0, { isActive: false }),
      ],
    });
    const priceless = (await variantsOf(id)).find(
      (v) => v.optionKey === "valve:butane",
    )!;
    expect(priceless.isActive).toBe(false);
    await expect(changeVariantActive(priceless.id, true)).rejects.toThrow(
      "ترکیب بدون قیمت",
    );
    await expect(
      resubmit(id, (raw) => {
        const rows = raw.variants as { id: string; isActive: boolean }[];
        rows.find((row) => row.id === priceless.id)!.isActive = true;
      }),
    ).rejects.toThrow();

    await resubmit(id, (raw) => {
      const rows = raw.variants as { id: string; price: number }[];
      rows.find((row) => row.id === priceless.id)!.price = 120_000;
    });
    await changeVariantActive(priceless.id, true);
    expect(
      (await db.productVariant.findUnique({ where: { id: priceless.id } }))!
        .isActive,
    ).toBe(true);
  });

  it("priceUpdatedAt فقط با تغییر قیمت به‌روز می‌شود", async () => {
    const id = await make("stamp", {
      options: [valve],
      variants: [combo({ valve: "persi" }, 100_000)],
    });
    const first = (await db.product.findUnique({ where: { id } }))!
      .priceUpdatedAt;
    expect(first).toBeInstanceOf(Date);

    await resubmit(id, (raw) => {
      raw.name = `تغییر نام ${RUN}`;
    });
    expect(
      (await db.product.findUnique({ where: { id } }))!.priceUpdatedAt,
    ).toEqual(first);

    await new Promise((resolve) => setTimeout(resolve, 15));
    await resubmit(id, (raw) => {
      (raw.variants as { price: number }[])[0]!.price = 110_000;
    });
    const later = (await db.product.findUnique({ where: { id } }))!
      .priceUpdatedAt!;
    expect(later.getTime()).toBeGreaterThan(first!.getTime());
  });
});

describe("محصول متناظر و محاسبه‌ی قیمت پرشده", () => {
  it("جفت‌شدن دوطرفه است و با تغییر/حذف جفت پاک می‌شود", async () => {
    const charge = await make("pair-charge", {
      options: [valve],
      variants: [
        combo({ valve: "persi" }, 3_400_000),
        combo({ valve: "butane" }, 3_400_000),
      ],
    });
    const buy = await make("pair-buy", {
      options: [fill],
      variants: [combo({ fill: "empty" }, 3_400_000)],
      pairedProductId: charge,
    });
    expect((await getProductForEdit(buy))!.paired?.id).toBe(charge);
    expect((await getProductForEdit(charge))!.paired?.id).toBe(buy);

    const other = await make("pair-other", {
      variants: [combo({}, 50_000)],
    });
    await resubmit(other, (raw) => {
      raw.pairedProductId = charge;
    });
    // charge حالا جفت «other» است؛ «buy» آزاد شده است
    expect((await getProductForEdit(charge))!.paired?.id).toBe(other);
    expect((await getProductForEdit(buy))!.paired).toBeNull();

    await resubmit(other, (raw) => {
      raw.pairedProductId = null;
    });
    expect((await getProductForEdit(charge))!.paired).toBeNull();
  });

  it("محصول نمی‌تواند متناظر خودش باشد", async () => {
    const id = await make("self-pair", {
      variants: [combo({}, 50_000)],
    });
    await expect(
      resubmit(id, (raw) => {
        raw.pairedProductId = id;
      }),
    ).rejects.toThrow("متناظر خودش");
  });

  it("خرید ۱۱ ⇒ ۶٬۸۰۰٬۰۰۰؛ قیمت‌های متفاوت شارژ ⇒ هشدار و بدون پر کردن", () => {
    const rows = [
      { selection: { fill: "empty" }, price: 3_400_000 },
      { selection: { fill: "filled" }, price: null },
    ];
    expect(computeFilledPrices(rows, [3_400_000, 3_400_000])).toEqual({
      kind: "ok",
      prices: [{ selection: { fill: "filled" }, price: 6_800_000 }],
    });
    expect(computeFilledPrices(rows, [3_400_000, 3_600_000])).toEqual({
      kind: "warn",
      message: DIFFERENT_CHARGE_PRICES_MESSAGE,
    });
  });
});

describe("قفل کد گزینه‌ها پس از اولین سفارش و اسنپ‌شات سفارش", () => {
  it("اسنپ‌شات گزینه‌ها در آیتم سفارش؛ بعد از سفارش کد مقدار قفل است", async () => {
    const catalog = await createCatalog();
    const id = await make("locked", {
      options: [valve],
      variants: [combo({ valve: "persi" }, 200_000)],
    });
    const variant = (await variantsOf(id))[0]!;
    const customer = await createCustomer();
    await fillCart(customer, [[variant.id, 1]]);
    await placeOrder(customer, catalog.post);

    const [order] = await ordersOf(customer.userId);
    expect(order!.items[0]!.optionsSnapshot).toEqual([
      { option: "نوع شیر", value: "پرسی" },
    ]);
    expect(order!.items[0]!.variantTitle).toBe("پرسی");

    // تغییر کد مقدار ممنوع
    await expect(
      resubmit(id, (raw) => {
        const options = raw.options as { values: { code: string }[] }[];
        options[0]!.values[0]!.code = "yazdi";
      }),
    ).rejects.toThrow("قابل تغییر");
    // تغییر برچسب و افزودن مقدار جدید مجاز است
    await resubmit(id, (raw) => {
      const options = raw.options as {
        values: { label: string; code: string }[];
      }[];
      options[0]!.values[0]!.label = "پرسی (جدید)";
      options[0]!.values.push({ label: "یزدی", code: "yazdi" });
    });
    expect(
      await db.productOptionValue.count({
        where: { option: { productId: id } },
      }),
    ).toBe(3);
  });
});

describe("کپی محصول", () => {
  it("نسخه‌ی غیرفعال با گزینه/ترکیب/قیمت، نام و نامک کپی، بدون کلمه‌ی کانونی", async () => {
    const id = await make("copy-src", {
      options: [valve],
      variants: [
        combo({ valve: "persi" }, 300_000),
        combo({ valve: "butane" }, 310_000),
      ],
      kind: "SERVICE",
      serviceTerms: "شرایط اختصاصی",
      focusKeyword: `کپسول-${RUN}`,
      seoTitle: "عنوان سئو",
      metaDescription: "توضیح متا",
    });
    const copy = await duplicateProduct(id);
    productIds.push(copy.id);

    const source = await db.product.findUnique({ where: { id } });
    const copied = await db.product.findUnique({
      where: { id: copy.id },
      include: { variants: true, options: { include: { values: true } } },
    });
    expect(copied).toMatchObject({
      isActive: false,
      name: `${source!.name} (کپی)`,
      slug: `${source!.slug}-copy`,
      focusKeyword: null,
      serviceTerms: "شرایط اختصاصی",
      seoTitle: "عنوان سئو",
      metaDescription: "توضیح متا",
      kind: "SERVICE",
      pairedProductId: null,
    });
    expect(copied!.options).toHaveLength(1);
    expect(copied!.options[0]!.values).toHaveLength(2);
    expect(copied!.variants.map((v) => [v.optionKey, v.price]).sort()).toEqual([
      ["valve:butane", 310_000],
      ["valve:persi", 300_000],
    ]);
    // کپی دوم نامک متفاوت می‌گیرد
    const second = await duplicateProduct(id);
    productIds.push(second.id);
    expect(
      (await db.product.findUnique({ where: { id: second.id } }))!.slug,
    ).toBe(`${source!.slug}-copy-2`);
  });
});

const shippingBase = {
  description: "",
  cost: 50_000,
  freeAboveAmount: null,
  provinces: [],
  payOnDelivery: false,
  isActive: true,
  sortOrder: 0,
};

describe("روش ارسال: برآورد تحویل و ساعت کاری", () => {
  it("ذخیره و ویرایش deliveryEstimate و businessHoursOnly", async () => {
    const parsed = shippingMethodSchema.parse({
      ...shippingBase,
      name: `پیک P0 ${RUN}`,
      deliveryEstimate: "همان روز، تا ۳ ساعت {{تکمیل توسط الو کپسول}}",
      businessHoursOnly: true,
    });
    await saveShippingMethod(adminId, null, parsed);
    const created = await db.shippingMethod.findFirstOrThrow({
      where: { name: `پیک P0 ${RUN}` },
    });
    shippingIds.push(created.id);
    expect(created).toMatchObject({
      deliveryEstimate: parsed.deliveryEstimate,
      businessHoursOnly: true,
    });

    await saveShippingMethod(
      adminId,
      created.id,
      shippingMethodSchema.parse({
        ...shippingBase,
        name: created.name,
        deliveryEstimate: "",
      }),
    );
    const after = await db.shippingMethod.findUniqueOrThrow({
      where: { id: created.id },
    });
    // businessHoursOnly ارسال‌نشده ⇒ دست‌نخورده؛ برآورد خالی ⇒ null
    expect(after.deliveryEstimate).toBeNull();
    expect(after.businessHoursOnly).toBe(true);
  });
});
