import { randomBytes } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { StorageDriver } from "@/lib/storage";
import { receiptPng } from "@/test/order-fixtures";

import {
  addMenuCategory,
  createMenu,
  deleteMenu,
  deleteMenuItem,
  reorderMenuCategories,
  reorderMenuItems,
  saveMenuItem,
  updateMenu,
} from "./menu.service";
import { setMenuItemImage } from "./menu-image.service";
import { getMenuForEditor, getPublicMenu } from "./menu-query.service";

/** منوی شعبه‌ها: ساخت/کپی، چینش، صفحه‌ی عمومی و تصاویر مشترک */

const RUN = randomBytes(3).toString("hex");
const menuIds = new Set<string>();

/** storage حافظه‌ای برای بررسی حذف فایل‌ها */
function memoryStorage() {
  const files = new Map<string, Buffer>();
  const driver: StorageDriver = {
    name: "local",
    async put({ key, body }) {
      files.set(key, body);
    },
    async delete(key) {
      files.delete(key);
    },
    publicUrl: (key) => `/test-media/${key}`,
    keyFromUrl: (url) =>
      url.startsWith("/test-media/") ? url.slice("/test-media/".length) : null,
  };
  return { driver, files };
}

async function newMenu(suffix: string, copyFrom: string | null = null) {
  const { id } = await createMenu(
    {
      name: `منوی تست ${suffix}`,
      slug: `t-${RUN}-${suffix}`,
      description: null,
      isActive: true,
    },
    copyFrom,
  );
  menuIds.add(id);
  return id;
}

async function addItem(menuId: string, categoryId: string, name: string) {
  const { id } = await saveMenuItem(menuId, null, {
    categoryId,
    name,
    description: null,
    price: 50_000,
  });
  return id;
}

afterAll(async () => {
  await db.menu.deleteMany({ where: { id: { in: [...menuIds] } } });
  await db.$disconnect();
});

describe("منوی شعبه", () => {
  it("نشانی تکراری رد می‌شود", async () => {
    const id = await newMenu("dup");
    await expect(newMenu("dup")).rejects.toThrow(
      "این نشانی برای منوی دیگری استفاده شده است.",
    );
    const other = await newMenu("dup2");
    await expect(
      updateMenu(other, {
        name: "x",
        slug: `t-${RUN}-dup`,
        description: null,
        isActive: true,
      }),
    ).rejects.toThrow("این نشانی");
    expect(id).toBeTruthy();
  });

  it("آیتم‌ها به ترتیب اضافه، چیده و بین دسته‌ها جابه‌جا می‌شوند", async () => {
    const menuId = await newMenu("order");
    const a = (await addMenuCategory(menuId, "کپسول")).id;
    const b = (await addMenuCategory(menuId, "دمنوش")).id;
    const [x, y, z] = [
      await addItem(menuId, a, "x"),
      await addItem(menuId, a, "y"),
      await addItem(menuId, a, "z"),
    ];

    await reorderMenuItems(a, [z, x, y]);
    await reorderMenuCategories(menuId, [b, a]);
    let menu = await getMenuForEditor(menuId);
    expect(menu?.categories.map((c) => c.name)).toEqual(["دمنوش", "کپسول"]);
    expect(menu?.categories[1]?.items.map((i) => i.name)).toEqual([
      "z",
      "x",
      "y",
    ]);

    // فهرست ناقص/کهنه ⇒ خطا
    await expect(reorderMenuItems(a, [z, x])).rejects.toThrow("تغییر کرده");

    // انتقال به دسته‌ی دیگر ⇒ انتهای آن دسته
    await saveMenuItem(menuId, x, {
      categoryId: b,
      name: "x",
      description: null,
      price: 60_000,
    });
    menu = await getMenuForEditor(menuId);
    expect(menu?.categories[0]?.items.map((i) => i.name)).toEqual(["x"]);
    expect(menu?.categories[0]?.items[0]?.price).toBe(60_000);
  });

  it("آیتم را نمی‌توان به دسته‌ی منوی دیگر برد", async () => {
    const first = await newMenu("own1");
    const second = await newMenu("own2");
    const foreign = (await addMenuCategory(second, "غریبه")).id;
    await expect(addItem(first, foreign, "x")).rejects.toThrow(
      "دسته یافت نشد.",
    );
  });

  it("صفحه‌ی عمومی: دسته‌ی خالی پنهان، منوی غیرفعال ۴۰۴", async () => {
    const menuId = await newMenu("public");
    const full = (await addMenuCategory(menuId, "پر")).id;
    await addMenuCategory(menuId, "خالی");
    await addItem(menuId, full, "چای");

    const slug = `t-${RUN}-public`;
    const menu = await getPublicMenu(slug);
    expect(menu?.categories.map((c) => c.name)).toEqual(["پر"]);

    await updateMenu(menuId, {
      name: "x",
      slug,
      description: null,
      isActive: false,
    });
    expect(await getPublicMenu(slug)).toBeNull();
  });

  it("کپی منو + تصویر مشترک: فایل فقط وقتی آخرین استفاده حذف شد پاک می‌شود", async () => {
    const { driver, files } = memoryStorage();
    const source = await newMenu("src");
    const category = (await addMenuCategory(source, "کپسول")).id;
    const item = await addItem(source, category, "پسته‌ای");
    const { imageUrl } = await setMenuItemImage(
      item,
      await receiptPng(),
      driver,
    );
    expect(files.size).toBe(1);

    const copy = await newMenu("copy", source);
    const copied = await getMenuForEditor(copy);
    expect(copied?.categories[0]?.items[0]).toMatchObject({
      name: "پسته‌ای",
      imageUrl,
    });

    // حذف مبدأ: کپی هنوز از تصویر استفاده می‌کند
    await deleteMenu(source);
    menuIds.delete(source);
    const copiedItem = copied!.categories[0]!.items[0]!.id;
    const remaining = await db.menuItem.count({ where: { imageUrl } });
    expect(remaining).toBe(1);

    // تصویر جدید روی کپی ⇒ تصویر قبلی دیگر استفاده‌ای ندارد و پاک می‌شود
    await setMenuItemImage(copiedItem, await receiptPng(), driver);
    expect(files.size).toBe(1);
    expect([...files.keys()][0]).not.toBe(imageUrl.split("/test-media/")[1]);

    await deleteMenuItem(copiedItem);
    expect(await db.menuItem.count({ where: { id: copiedItem } })).toBe(0);
  });
});
