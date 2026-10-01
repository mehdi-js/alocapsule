import { afterAll, describe, expect, it } from "vitest";

import { applyContentTokens } from "@/lib/content-tokens";
import { db } from "@/lib/db";
import {
  buildSizeSwitch,
  parseSelectionParams,
  resolveSelected,
} from "@/lib/option-selection";
import { computeFilledPrices } from "@/lib/product-options";
import { HOME_CONTENT, HOME_FAQ } from "@/lib/seo/home-content";

import {
  getCategoryPriceTable,
  getProductPage,
  listCategoryTableProducts,
} from "./catalog-page.service";
import { getContentTokenValues } from "./content-tokens.service";

/**
 * P2: کاتالوگ seed شده در دیتابیس (`npm run db:seed`) با معیارهای SEO.md — شامل
 * معیارهای فروشگاهی P1 که تا قبل از seed قابل آزمون با داده‌ی واقعی نبودند.
 */

afterAll(() => db.$disconnect());

async function page(slug: string) {
  const lookup = await getProductPage(slug);
  if (lookup.kind !== "found") throw new Error(`${slug} پیدا نشد`);
  return lookup.data;
}

describe("محصولات seed در دیتابیس", () => {
  it("شارژ ۵۰: بوتان با ?valve=butane ⇒ ۳٬۸۵۰٬۰۰۰ (HTML اولیه)", async () => {
    const product = await page("gas-capsule-refill-50kg");
    expect(product.available).toBe(true);
    const selected = resolveSelected(
      product.variants,
      parseSelectionParams({ valve: "butane" }, product.options),
      product.options,
    );
    expect(selected).toMatchObject({
      price: 3_850_000,
      selection: { valve: "butane" },
    });
    // پارامتر نامعتبر ⇒ پیش‌فرض (پرسی)
    expect(
      resolveSelected(
        product.variants,
        parseSelectionParams({ valve: "xyz" }, product.options),
        product.options,
      )?.selection,
    ).toEqual({ valve: "persi" });
    expect(product.priceUpdatedAt).toBeInstanceOf(Date);
  });

  it("خرید ۱۱: ?fill=filled ⇒ ۶٬۸۰۰٬۰۰۰ و خالی ⇒ ۶٬۰۰۰٬۰۰۰", async () => {
    const product = await page("buy-gas-capsule-11kg");
    const price = (fill: string) =>
      resolveSelected(
        product.variants,
        parseSelectionParams({ fill }, product.options),
        product.options,
      )?.price;
    expect(price("filled")).toBe(6_800_000);
    expect(price("empty")).toBe(6_000_000);
  });

  it("«محاسبه‌ی قیمت پرشده» برای خرید ۱۱ با شارژ ۱۱ متناظر ⇒ ۶٬۸۰۰٬۰۰۰", async () => {
    const buy = await page("buy-gas-capsule-11kg");
    const charge = await page("gas-capsule-refill-11kg");
    const result = computeFilledPrices(
      [
        { selection: { fill: "empty" }, price: 6_000_000 },
        { selection: { fill: "filled" }, price: null },
      ],
      charge.variants.map((v) => v.price),
    );
    expect(buy.options[0]!.code).toBe("fill");
    expect(result).toEqual({
      kind: "ok",
      prices: [{ selection: { fill: "filled" }, price: 6_800_000 }],
    });
  });

  it("محصول متناظر دوطرفه و ۱۲ محصول با وضعیت درست", async () => {
    const rows = await db.product.findMany({
      where: {
        slug: {
          in: [
            "gas-capsule-refill-25kg",
            "buy-gas-capsule-25kg",
            "oxygen-capsule-refill",
            "industrial-gas-refill",
          ],
        },
      },
      select: { slug: true, pairedProduct: { select: { slug: true } } },
    });
    const paired = Object.fromEntries(
      rows.map((r) => [r.slug, r.pairedProduct?.slug]),
    );
    expect(paired).toEqual({
      "gas-capsule-refill-25kg": "buy-gas-capsule-25kg",
      "buy-gas-capsule-25kg": "gas-capsule-refill-25kg",
      "oxygen-capsule-refill": "industrial-gas-refill",
      "industrial-gas-refill": "oxygen-capsule-refill",
    });

    const used = await db.product.findUniqueOrThrow({
      where: { slug: "used-gas-capsule" },
      include: { variants: true },
    });
    expect(used).toMatchObject({ isActive: false, noindex: true });
    expect(used.variants).toHaveLength(8);
    expect(used.variants.every((v) => !v.isActive && v.price === 0)).toBe(true);
    const picnic = await db.product.findUniqueOrThrow({
      where: { slug: "picnic-gas" },
      include: { options: { include: { values: true } } },
    });
    expect(picnic).toMatchObject({ isActive: false, noindex: true });
    expect(picnic.options.map((o) => [o.code, o.values.length])).toEqual([
      ["size", 0],
    ]);
    for (const slug of ["oxygen-capsule-refill", "industrial-gas-refill"]) {
      const inquiry = await page(slug);
      expect(inquiry).toMatchObject({
        pricingMode: "INQUIRY",
        kind: "SERVICE",
        available: true,
      });
      expect(inquiry.variants).toEqual([]);
    }
  });
});

describe("hub و سوییچ اندازه", () => {
  async function hubId(slug: string) {
    return (await db.category.findUniqueOrThrow({ where: { slug } })).id;
  }

  it("جدول hub شارژ: ۴ ردیف و ستون پرسی/بوتان؛ هر ردیف لینک صفحه‌ی خودش", async () => {
    const dto = await getCategoryPriceTable(await hubId("gas-capsule-refill"));
    expect(dto!.table.columns.map((c) => c.label)).toEqual(["پرسی", "بوتان"]);
    expect(dto!.table.rows.map((r) => r.href)).toEqual([
      "/products/gas-capsule-refill-11kg",
      "/products/gas-capsule-refill-25kg",
      "/products/gas-capsule-refill-33kg",
      "/products/gas-capsule-refill-50kg",
    ]);
    expect(dto!.table.rows.map((r) => r.cells[0]?.price)).toEqual([
      800_000, 2_200_000, 2_450_000, 3_850_000,
    ]);
    expect(dto!.kind).toBe("SERVICE");
  });

  it("جدول hub خرید: ۴ ردیف، ستون‌های خالی/پرشده", async () => {
    const dto = await getCategoryPriceTable(await hubId("buy-gas-capsule"));
    expect(dto!.table.columns.map((c) => c.label)).toEqual(["خالی", "پرشده"]);
    expect(dto!.table.rows).toHaveLength(4);
    expect(dto!.table.rows.map((r) => r.cells.map((c) => c?.price))).toEqual([
      [6_000_000, 6_800_000],
      [9_000_000, 11_200_000],
      [11_500_000, 13_950_000],
      [15_000_000, 18_850_000],
    ]);
    expect(dto!.kind).toBe("PHYSICAL");
  });

  it("سوییچ اندازه: ۱۱ با ?valve=butane به ۲۵ لینک می‌دهد؛ دست دوم سوییچ ندارد", async () => {
    const siblings = await listCategoryTableProducts(
      await hubId("gas-capsule-refill"),
    );
    const result = buildSizeSwitch(siblings, "gas-capsule-refill-11kg", {
      valve: "butane",
    });
    expect(result.items.map((i) => i.label)).toEqual(["۱۱", "۲۵", "۳۳", "۵۰"]);
    expect(result.suffix).toBe("کیلویی");
    expect(result.items[1]!.href).toBe(
      "/products/gas-capsule-refill-25kg?valve=butane",
    );

    const usedSiblings = await listCategoryTableProducts(
      await hubId("used-gas-capsules"),
    );
    expect(buildSizeSwitch(usedSiblings, "used-gas-capsule", {}).items).toEqual(
      [],
    );
    // دست دوم غیرفعال است ⇒ اصلاً در فهرست جدول/سوییچ نمی‌آید
    expect(
      await getCategoryPriceTable(await hubId("used-gas-capsules")),
    ).toBeNull();
  });

  it("دسته‌ها: دو hub ایندکس‌شونده با H1؛ بقیه noindex", async () => {
    const rows = await db.category.findMany({
      where: {
        slug: {
          in: [
            "gas-capsule-refill",
            "buy-gas-capsule",
            "used-gas-capsules",
            "picnic",
            "other-gases",
          ],
        },
      },
      select: { slug: true, noindex: true, h1: true },
      orderBy: { slug: "asc" },
    });
    expect(rows).toEqual([
      { slug: "buy-gas-capsule", noindex: false, h1: "قیمت کپسول گاز" },
      { slug: "gas-capsule-refill", noindex: false, h1: "قیمت شارژ کپسول گاز" },
      { slug: "other-gases", noindex: true, h1: null },
      { slug: "picnic", noindex: true, h1: null },
      { slug: "used-gas-capsules", noindex: true, h1: null },
    ]);
  });
});

describe("روش‌های ارسال و توکن‌های متن", () => {
  it("عادی و فوری غیرفعال تا هزینه‌گذاری؛ حضوری فعال و رایگان", async () => {
    const methods = await db.shippingMethod.findMany({
      where: {
        id: {
          in: [
            "seed-shipping-normal",
            "seed-shipping-express",
            "seed-shipping-pickup",
          ],
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    expect(
      methods.map((m) => [
        m.name,
        m.isActive,
        m.deliveryEstimate,
        m.businessHoursOnly,
        m.requiresAddress,
        m.freeAboveQuantity,
      ]),
    ).toEqual([
      ["ارسال عادی", false, "۱ روزه", false, true, 100],
      ["ارسال فوری", false, "۱ تا ۴ ساعت", true, true, null],
      ["تحویل حضوری", true, null, false, false, null],
    ]);
    expect(
      await db.shippingMethod.count({ where: { id: "seed-shipping-courier" } }),
    ).toBe(0);
  });

  it("توکن‌های متن صفحه‌ی اصلی از تنظیمات پر می‌شوند؛ بدون {{ و [[", async () => {
    const tokens = await getContentTokenValues();
    expect(tokens).toMatchObject({
      "normal.estimate": "۱ روزه",
      "express.estimate": "۱ تا ۴ ساعت",
      "free.quantity": "۱۰۰",
    });
    const content = applyContentTokens(HOME_CONTENT, tokens);
    expect(content).toContain("ارسال عادی** (تحویل ۱ روزه)");
    expect(content).toContain("(تحویل ۱ تا ۴ ساعت)");
    expect(content).toContain("۱۰۰ عدد به بالا");
    expect(content).not.toMatch(/\[\[|\{\{/);
    for (const item of HOME_FAQ) {
      const answer = applyContentTokens(item.answer, tokens);
      expect(answer).not.toMatch(/\[\[|\{\{/);
    }
  });

  it("تنظیمات سئوی صفحه‌ی اصلی و برند در دیتابیس", async () => {
    const rows = await db.setting.findMany({
      where: {
        key: {
          in: [
            "seo.alternateNames",
            "seo.home.h1",
            "seo.home.content",
            "seed.version",
            "catalog.priceIncludesNote",
            "catalog.priceIncludesNoteProducts",
            "shipping.areaNote",
          ],
        },
      },
    });
    const value = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(value["seo.alternateNames"]).toEqual([
      "Alo Capsule",
      "الوکپسول",
      "alocapsule",
    ]);
    expect(value["seo.home.h1"]).toBe(
      "شارژ کپسول گاز و خرید کپسول گاز در تهران",
    );
    expect(String(value["seo.home.content"])).toContain(
      "## شارژ کپسول گاز با تعویض سریع",
    );
    expect(value["seed.version"]).toBe("seo-p3");
    expect(String(value["catalog.priceIncludesNote"])).toContain(
      "فقط شامل هزینه‌ی شارژ",
    );
    expect(value["shipping.areaNote"]).toBe(
      "ارسال فقط در محدوده‌ی شهر تهران انجام می‌شود.",
    );
  });
});
