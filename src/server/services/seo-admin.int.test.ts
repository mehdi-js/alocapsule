import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { categoryInputSchema } from "@/lib/validation/category";
import { productInputSchema } from "@/lib/validation/product";

import {
  createCategory,
  removeCategory,
  updateCategory,
} from "./category.service";
import {
  archiveProduct,
  changeProductActive,
  createProduct,
  deleteProductPermanently,
  restoreProduct,
  updateProduct,
} from "./product.service";

/**
 * معیارهای فاز S1 (SEO.md §۱۳): تاریخچه‌ی نامک، هشدار کلمه‌ی تکراری بدون
 * مسدود کردن ذخیره، بایگانی به‌جای حذف و ریدایرکت آدرس‌های حذف‌شده.
 */

const RUN = randomBytes(3).toString("hex");
const productIds: string[] = [];
const categoryIds: string[] = [];
let categoryId: string;

function productInput(overrides: Record<string, unknown> = {}) {
  return productInputSchema.parse({
    name: `محصول سئو ${RUN}`,
    slug: `seo-test-${RUN}`,
    categoryId,
    unit: "GRAM",
    variants: [{ unitValue: 500, price: 100_000, shippingWeightGrams: 600 }],
    ...overrides,
  });
}

function categoryInput(overrides: Record<string, unknown> = {}) {
  return categoryInputSchema.parse({
    name: `دسته سئو ${RUN}`,
    slug: `seo-cat-${RUN}`,
    ...overrides,
  });
}

async function newProduct(overrides: Record<string, unknown> = {}) {
  const result = await createProduct(productInput(overrides));
  productIds.push(result.id);
  return result;
}

beforeAll(async () => {
  const category = await createCategory(categoryInput());
  categoryId = category.id;
  categoryIds.push(categoryId);
});

afterAll(async () => {
  await db.slugHistory.deleteMany({
    where: { entityId: { in: [...productIds, ...categoryIds] } },
  });
  await db.redirect.deleteMany({ where: { fromPath: { contains: RUN } } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  // زیردسته‌ها قبل از والد
  await db.category.deleteMany({
    where: { id: { in: categoryIds }, parentId: { not: null } },
  });
  await db.category.deleteMany({ where: { id: { in: categoryIds } } });
  await db.$disconnect();
});

describe("تاریخچه‌ی نامک", () => {
  it("تغییر نامک محصول یک ردیف SlugHistory می‌سازد؛ برگشت به آن حذفش می‌کند", async () => {
    const { id } = await newProduct({ slug: `slug-a-${RUN}` });
    await updateProduct(id, productInput({ slug: `slug-b-${RUN}` }));

    const history = await db.slugHistory.findMany({
      where: { entityType: "PRODUCT", entityId: id },
    });
    expect(history.map((row) => row.oldSlug)).toEqual([`slug-a-${RUN}`]);

    // ذخیره‌ی بدون تغییر نامک ردیف جدید نمی‌سازد
    await updateProduct(id, productInput({ slug: `slug-b-${RUN}` }));
    expect(
      await db.slugHistory.count({
        where: { entityType: "PRODUCT", entityId: id },
      }),
    ).toBe(1);

    await updateProduct(id, productInput({ slug: `slug-a-${RUN}` }));
    const after = await db.slugHistory.findMany({
      where: { entityType: "PRODUCT", entityId: id },
    });
    expect(after.map((row) => row.oldSlug)).toEqual([`slug-b-${RUN}`]);
  });

  it("تغییر نامک دسته هم ثبت می‌شود", async () => {
    const { id } = await createCategory(
      categoryInput({ name: `دسته دوم ${RUN}`, slug: `cat-a-${RUN}` }),
    );
    categoryIds.push(id);
    await updateCategory(
      id,
      categoryInput({ name: `دسته دوم ${RUN}`, slug: `cat-b-${RUN}` }),
    );
    const history = await db.slugHistory.findMany({
      where: { entityType: "CATEGORY", entityId: id },
    });
    expect(history.map((row) => row.oldSlug)).toEqual([`cat-a-${RUN}`]);
  });
});

describe("یکتایی کلمه‌ی کانونی", () => {
  it("کلمه‌ی تکراری ⇒ ذخیره انجام می‌شود ولی هشدار نام صفحه‌ی رقیب را دارد", async () => {
    const keyword = `کلمه پسته‌ای ${RUN}`;
    await newProduct({
      name: `رقیب ${RUN}`,
      slug: `rival-${RUN}`,
      focusKeyword: keyword,
    });
    const second = await newProduct({
      name: `دومی ${RUN}`,
      slug: `second-${RUN}`,
      // املای دیگر همان عبارت
      focusKeyword: `کلمه پسته ای ${RUN}`,
    });

    expect(second.seoWarning).toContain(`محصول «رقیب ${RUN}»`);
    expect(second.seoWarning).toContain("کلمه‌ی کانونی");
    const saved = await db.product.findUniqueOrThrow({
      where: { id: second.id },
    });
    expect(saved.focusKeyword).toBe(`کلمه پسته ای ${RUN}`);
  });

  it("بدون تکرار ⇒ هشداری نیست", async () => {
    const result = await newProduct({
      name: `یکتا ${RUN}`,
      slug: `unique-${RUN}`,
      focusKeyword: `عبارت یکتا ${RUN}`,
      seoTitle: `عنوان یکتا ${RUN}`,
    });
    expect(result.seoWarning).toBeNull();
  });
});

describe("بایگانی به‌جای حذف", () => {
  it("بایگانی: غیرفعال + مقصد پیش‌فرض دسته؛ فعال‌سازی بسته؛ بازگردانی", async () => {
    const { id } = await newProduct({
      name: `بایگانی ${RUN}`,
      slug: `arch-${RUN}`,
    });
    await archiveProduct(id, null);
    const archived = await db.product.findUniqueOrThrow({ where: { id } });
    expect(archived.isActive).toBe(false);
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.archiveRedirectTo).toBe(`/category/seo-cat-${RUN}`);

    await expect(changeProductActive(id, true)).rejects.toThrow("بایگانی");
    await expect(archiveProduct(id, `/products/arch-${RUN}`)).rejects.toThrow(
      "خود همین محصول",
    );

    await restoreProduct(id);
    const restored = await db.product.findUniqueOrThrow({ where: { id } });
    expect(restored.archivedAt).toBeNull();
    expect(restored.isActive).toBe(false);
  });

  it("حذف دائمی فقط بعد از بایگانی؛ آدرس فعلی و قبلی ریدایرکت 301 می‌شوند", async () => {
    const { id } = await newProduct({
      name: `دائمی ${RUN}`,
      slug: `perm-a-${RUN}`,
    });
    await updateProduct(
      id,
      productInput({ name: `دائمی ${RUN}`, slug: `perm-b-${RUN}` }),
    );
    await expect(deleteProductPermanently(id)).rejects.toThrow("بایگانی");

    await archiveProduct(id, "/products");
    await deleteProductPermanently(id);

    expect(await db.product.findUnique({ where: { id } })).toBeNull();
    const redirects = await db.redirect.findMany({
      where: {
        fromPath: {
          in: [`/products/perm-a-${RUN}`, `/products/perm-b-${RUN}`],
        },
      },
      orderBy: { fromPath: "asc" },
    });
    expect(redirects.map((r) => [r.fromPath, r.toPath, r.statusCode])).toEqual([
      [`/products/perm-a-${RUN}`, "/products", 301],
      [`/products/perm-b-${RUN}`, "/products", 301],
    ]);
    expect(await db.slugHistory.count({ where: { entityId: id } })).toBe(0);
  });
});

describe("حذف دسته", () => {
  it("آدرس دسته‌ی حذف‌شده به دسته‌ی والد ریدایرکت می‌شود", async () => {
    const { id } = await createCategory(
      categoryInput({
        name: `زیردسته ${RUN}`,
        slug: `child-${RUN}`,
        parentId: categoryId,
      }),
    );
    categoryIds.push(id);
    await removeCategory(id);
    const redirect = await db.redirect.findUniqueOrThrow({
      where: { fromPath: `/category/child-${RUN}` },
    });
    expect(redirect.toPath).toBe(`/category/seo-cat-${RUN}`);
  });
});
