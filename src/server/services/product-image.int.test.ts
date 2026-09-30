import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { StorageDriver } from "@/lib/storage";
import {
  type Catalog,
  cleanupFixtures,
  createCatalog,
  receiptPng,
} from "@/test/order-fixtures";

import {
  addProductImage,
  changeImageAlt,
  removeProductImage,
} from "./product-image.service";
import { getBrandName } from "./seo-settings.service";

/**
 * تصویر محصول (SEO.md §۶.۲ و §۹): نام فایل `{نامک}-{ردیف}-{۴ نویسه}`، ابعاد،
 * برش OG و alt الزامی با پیش‌فرض «نام محصول + برند».
 */

const stored = new Map<string, string>();
const storage: StorageDriver = {
  name: "local",
  async put({ key, contentType }) {
    stored.set(key, contentType);
  },
  async delete(key) {
    stored.delete(key);
  },
  publicUrl: (key) => `/test-media/${key}`,
  keyFromUrl: () => null,
};

let catalog: Catalog;

beforeAll(async () => {
  catalog = await createCatalog();
});

afterAll(async () => {
  await cleanupFixtures();
});

describe("تصاویر محصول", () => {
  it("هر تصویر alt پیش‌فرض می‌گیرد؛ تصاویر بعدی شماره دارند", async () => {
    const product = await db.product.findUniqueOrThrow({
      where: { id: catalog.productId },
    });
    const brand = await getBrandName();
    const first = await addProductImage(
      product.id,
      await receiptPng(),
      storage,
    );
    const second = await addProductImage(
      product.id,
      await receiptPng(),
      storage,
    );

    const images = await db.productImage.findMany({
      where: { id: { in: [first.id, second.id] } },
      orderBy: { sortOrder: "asc" },
    });
    expect(images.map((image) => image.alt)).toEqual([
      `${product.name} ${brand}`,
      `${product.name} ${brand} ۲`,
    ]);
  });

  it("نام فایل از نامک، ثبت ابعاد و برش OG؛ حذف همه‌ی فایل‌ها را پاک می‌کند", async () => {
    const product = await db.product.findUniqueOrThrow({
      where: { id: catalog.productId },
    });
    const dto = await addProductImage(product.id, await receiptPng(), storage);
    const image = await db.productImage.findUniqueOrThrow({
      where: { id: dto.id },
    });

    const base = new RegExp(
      `^/test-media/products/${product.slug}-\\d+-[0-9a-f]{4}\\.webp$`,
    );
    expect(image.url).toMatch(base);
    expect(image.ogUrl).toBe(image.url.replace(/\.webp$/, "-og.jpg"));
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);

    const key = image.url.slice("/test-media/".length);
    expect(stored.get(key)).toBe("image/webp");
    expect(stored.get(key.replace(/\.webp$/, "-thumb.webp"))).toBe(
      "image/webp",
    );
    expect(stored.get(key.replace(/\.webp$/, "-og.jpg"))).toBe("image/jpeg");

    await removeProductImage(image.id, {
      ...storage,
      keyFromUrl: (url) => url.slice("/test-media/".length),
    });
    expect([...stored.keys()].some((k) => k.startsWith(key.slice(0, -5)))).toBe(
      false,
    );
  });

  it("alt خالی ⇒ خطای اعتبارسنجی؛ alt معتبر ذخیره می‌شود", async () => {
    const dto = await addProductImage(
      catalog.productId,
      await receiptPng(),
      storage,
    );
    await expect(changeImageAlt(dto.id, "   ")).rejects.toThrow("alt");
    await changeImageAlt(dto.id, "  برش نزدیک   کپسول ");
    const image = await db.productImage.findUniqueOrThrow({
      where: { id: dto.id },
    });
    expect(image.alt).toBe("برش نزدیک کپسول");
  });
});
