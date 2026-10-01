import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { categoryInputSchema } from "@/lib/validation/category";
import { productInputSchema } from "@/lib/validation/product";
import { findSitemapEntries } from "@/server/repositories/catalog-page.repository";

import {
  getCategoryPage,
  getProductPage,
  listRelatedProducts,
} from "./catalog-page.service";
import { createCategory, updateCategory } from "./category.service";
import {
  archiveProduct,
  changeProductActive,
  createProduct,
  updateProduct,
} from "./product.service";

/**
 * صفحات عمومی (SEO.md §۴.۳، §۱۱.۱، §۱۲، §۸.۱): محصول غیرفعال زنده، بایگانی
 * و نامک قدیمی ⇒ ریدایرکت، محصولات مرتبط و sitemap.
 */

const RUN = randomBytes(3).toString("hex");
const productIds: string[] = [];
const categoryIds: string[] = [];
let parentId: string;
let childId: string;

const variant = { price: 100_000, shippingWeightGrams: 600 };

async function newCategory(slug: string, parent: string | null = null) {
  const { id } = await createCategory(
    categoryInputSchema.parse({
      name: `دسته ${slug}`,
      slug,
      parentId: parent,
    }),
  );
  categoryIds.push(id);
  return id;
}

function productInput(slug: string, categoryId: string, extra = {}) {
  return productInputSchema.parse({
    name: `محصول ${slug}`,
    slug,
    categoryId,
    unit: "GRAM",
    variants: [variant],
    ...extra,
  });
}

async function newProduct(slug: string, categoryId: string, extra = {}) {
  const { id } = await createProduct(productInput(slug, categoryId, extra));
  productIds.push(id);
  return id;
}

beforeAll(async () => {
  parentId = await newCategory(`cp-parent-${RUN}`);
  childId = await newCategory(`cp-child-${RUN}`, parentId);
});

afterAll(async () => {
  await db.slugHistory.deleteMany({
    where: { entityId: { in: [...productIds, ...categoryIds] } },
  });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.category.deleteMany({
    where: { id: { in: categoryIds }, parentId: { not: null } },
  });
  await db.category.deleteMany({ where: { id: { in: categoryIds } } });
  await db.$disconnect();
});

describe("صفحه‌ی محصول", () => {
  it("فعال ⇒ قابل سفارش؛ breadcrumb از دسته‌ی والد", async () => {
    await newProduct(`cp-active-${RUN}`, childId);
    const page = await getProductPage(`cp-active-${RUN}`);
    expect(page.kind).toBe("found");
    if (page.kind !== "found") return;
    expect(page.data.available).toBe(true);
    expect(page.data.categoryTrail.map((c) => c.path)).toEqual([
      `/category/cp-parent-${RUN}`,
      `/category/cp-child-${RUN}`,
    ]);
    expect(page.data.schemaVariants).toEqual([{ price: 100_000, sku: null }]);
  });

  it("غیرفعال ⇒ صفحه پیدا می‌شود ولی قابل سفارش نیست (قیمت schema می‌ماند)", async () => {
    const id = await newProduct(`cp-off-${RUN}`, childId);
    await changeProductActive(id, false);
    const page = await getProductPage(`cp-off-${RUN}`);
    expect(page.kind).toBe("found");
    if (page.kind !== "found") return;
    expect(page.data.available).toBe(false);
    expect(page.data.schemaVariants).toHaveLength(1);
  });

  it("بایگانی ⇒ ریدایرکت به مقصد؛ نامک قدیمی ⇒ نامک فعلی", async () => {
    const archived = await newProduct(`cp-arch-${RUN}`, childId);
    await archiveProduct(archived, "/products");
    expect(await getProductPage(`cp-arch-${RUN}`)).toEqual({
      kind: "redirect",
      to: "/products",
    });

    const renamed = await newProduct(`cp-old-${RUN}`, childId);
    await updateProduct(renamed, productInput(`cp-new-${RUN}`, childId));
    expect(await getProductPage(`cp-old-${RUN}`)).toEqual({
      kind: "redirect",
      to: `/products/cp-new-${RUN}`,
    });

    // نامک قدیمیِ محصولی که بعداً بایگانی شد ⇒ مستقیم به مقصد نهایی (بدون زنجیره)
    await archiveProduct(renamed, `/category/cp-parent-${RUN}`);
    expect(await getProductPage(`cp-old-${RUN}`)).toEqual({
      kind: "redirect",
      to: `/category/cp-parent-${RUN}`,
    });
    expect(await getProductPage(`cp-none-${RUN}`)).toEqual({ kind: "missing" });
  });
});

describe("محصولات مرتبط", () => {
  it("اول همان دسته، سپس دسته‌ی والد؛ خودش و ناموجودها نیستند", async () => {
    const self = await newProduct(`cp-rel-self-${RUN}`, childId);
    await newProduct(`cp-rel-parent-${RUN}`, parentId);
    const related = await listRelatedProducts({
      id: self,
      categoryId: childId,
      categorySlug: `cp-child-${RUN}`,
      pairedProductId: null,
    });
    const slugs = related.map((item) => item.slug);
    expect(slugs).not.toContain(`cp-rel-self-${RUN}`);
    expect(slugs).not.toContain(`cp-off-${RUN}`);
    expect(slugs).toContain(`cp-active-${RUN}`);
    expect(slugs.indexOf(`cp-active-${RUN}`)).toBeLessThan(
      slugs.indexOf(`cp-rel-parent-${RUN}`),
    );
  });
});

describe("صفحه‌ی دسته و sitemap", () => {
  it("نامک قدیمی دسته ⇒ ریدایرکت؛ والدها در breadcrumb", async () => {
    const id = await newCategory(`cp-cat-a-${RUN}`, parentId);
    await updateCategory(
      id,
      categoryInputSchema.parse({
        name: `دسته cp-cat-a-${RUN}`,
        slug: `cp-cat-b-${RUN}`,
        parentId,
      }),
    );
    expect(await getCategoryPage(`cp-cat-a-${RUN}`)).toEqual({
      kind: "redirect",
      to: `/category/cp-cat-b-${RUN}`,
    });
    const page = await getCategoryPage(`cp-cat-b-${RUN}`);
    expect(page.kind === "found" && page.data.parents).toEqual([
      { name: `دسته cp-parent-${RUN}`, path: `/category/cp-parent-${RUN}` },
    ]);
  });

  it("sitemap: فعال و غیرفعال هست؛ بایگانی و noindex نیست", async () => {
    await newProduct(`cp-noindex-${RUN}`, childId, { noindex: true });
    const { products } = await findSitemapEntries();
    const slugs = new Set(products.map((p) => p.slug));
    expect(slugs.has(`cp-active-${RUN}`)).toBe(true);
    expect(slugs.has(`cp-off-${RUN}`)).toBe(true);
    expect(slugs.has(`cp-arch-${RUN}`)).toBe(false);
    expect(slugs.has(`cp-noindex-${RUN}`)).toBe(false);
  });
});
