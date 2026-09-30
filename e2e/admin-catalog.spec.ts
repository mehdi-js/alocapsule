import { expect, type Page, test } from "@playwright/test";

import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  db,
  loginWithPassword,
  RUN_ID,
} from "./support";

/**
 * F5: ادمین هر ۴ ترکیب نوع/حالت قیمت را از پنل می‌سازد و نتیجه در دیتابیس و
 * فروشگاه درست است؛ تغییر حالت به استعلامی، فیلتر لیست، تنظیمات کسب‌وکار.
 */

const slug = (name: string) => `e2e-f5-${name}-${RUN_ID}`;
const CATEGORY_LABEL = "دسته‌ی تست e2e";

interface Combo {
  key: string;
  kind: "PHYSICAL" | "SERVICE";
  pricingMode: "FIXED" | "INQUIRY";
  price?: number;
  terms?: string;
}

const COMBOS: Combo[] = [
  { key: "phys-fixed", kind: "PHYSICAL", pricingMode: "FIXED", price: 250_000 },
  {
    key: "svc-fixed",
    kind: "SERVICE",
    pricingMode: "FIXED",
    price: 900_000,
    terms: "شرایط اختصاصی خدمت نمونه",
  },
  { key: "svc-inquiry", kind: "SERVICE", pricingMode: "INQUIRY" },
  { key: "phys-inquiry", kind: "PHYSICAL", pricingMode: "INQUIRY" },
];

async function createViaPanel(page: Page, combo: Combo) {
  await page.goto("/admin/products/new");
  await page.locator("#name").fill(`محصول ${combo.key}`);
  await page.locator("#slug").fill(slug(combo.key));
  await page.locator("#categoryId").selectOption({ label: CATEGORY_LABEL });
  await page.locator("#kind").selectOption(combo.kind);
  await page.locator("#pricingMode").selectOption(combo.pricingMode);

  // بخش شرایط فقط برای خدمت؛ بخش متغیرها فقط برای قیمت‌دار
  await expect(page.locator("#serviceTerms")).toHaveCount(
    combo.kind === "SERVICE" ? 1 : 0,
  );
  await expect(page.getByLabel("قیمت (تومان)")).toHaveCount(
    combo.pricingMode === "FIXED" ? 1 : 0,
  );

  if (combo.terms) await page.locator("#serviceTerms").fill(combo.terms);
  if (combo.pricingMode === "FIXED") {
    await page.getByLabel("وزن ارسال (گرم)").fill("11000");
    await page.getByLabel("قیمت (تومان)").fill(String(combo.price));
  }
  await page.getByRole("button", { name: "ساخت محصول" }).click();
  await page.waitForURL(/\/admin\/products\/[^/]+\/edit$/);
}

test.describe.serial("پنل ادمین: نوع محصول و حالت قیمت", () => {
  test.afterAll(async () => {
    await db().product.deleteMany({
      where: { slug: { startsWith: "e2e-f5-", endsWith: RUN_ID } },
    });
  });

  test("ساخت هر ۴ ترکیب از پنل و بررسی دیتابیس و فروشگاه", async ({
    browser,
  }) => {
    const admin = await browser.newContext();
    const page = await admin.newPage();
    await loginWithPassword(page, ADMIN_PHONE, ADMIN_PASSWORD, "/admin");

    for (const combo of COMBOS) await createViaPanel(page, combo);

    for (const combo of COMBOS) {
      const saved = await db().product.findUniqueOrThrow({
        where: { slug: slug(combo.key) },
        include: { variants: true },
      });
      expect(saved).toMatchObject({
        kind: combo.kind,
        pricingMode: combo.pricingMode,
        serviceTerms: combo.terms ?? null,
        isActive: true,
      });
      expect(saved.variants).toHaveLength(
        combo.pricingMode === "FIXED" ? 1 : 0,
      );
      if (combo.price) expect(saved.variants[0]!.price).toBe(combo.price);
    }

    // فروشگاه: قیمت‌دار قابل خرید است؛ استعلامی دکمه‌ی خرید ندارد
    const shop = await browser.newContext();
    const store = await shop.newPage();
    await store.goto(`/products/${slug("phys-fixed")}`);
    await expect(
      store.getByRole("button", { name: "افزودن به سبد خرید" }).first(),
    ).toBeVisible();
    for (const key of ["svc-inquiry", "phys-inquiry"]) {
      await store.goto(`/products/${slug(key)}`);
      await expect(
        store.getByRole("button", { name: "افزودن به سبد خرید" }),
      ).toHaveCount(0);
    }
    await shop.close();
    await admin.close();
  });

  test("فیلتر لیست، ستون‌ها و تغییر حالت به استعلامی با هشدار", async ({
    browser,
  }) => {
    const admin = await browser.newContext();
    const page = await admin.newPage();
    await loginWithPassword(page, ADMIN_PHONE, ADMIN_PASSWORD, "/admin");

    // فیلتر: فقط خدمتِ استعلامی
    await page.goto(
      `/admin/products?kind=SERVICE&pricing=INQUIRY&q=${encodeURIComponent("محصول")}`,
    );
    await expect(page.getByText("محصول svc-inquiry")).toBeVisible();
    await expect(page.getByText("محصول svc-fixed")).toHaveCount(0);
    await expect(page.getByText("محصول phys-inquiry")).toHaveCount(0);
    const row = page.getByRole("row").filter({ hasText: "محصول svc-inquiry" });
    await expect(row.getByText("خدمت", { exact: true })).toBeVisible();
    await expect(row.getByText("استعلامی").first()).toBeVisible();

    // تغییر «خدمت قیمت‌دار» به استعلامی: هشدار و غیرفعال شدن متغیر (نه حذف)
    const product = await db().product.findUniqueOrThrow({
      where: { slug: slug("svc-fixed") },
    });
    await page.goto(`/admin/products/${product.id}/edit`);
    await page.locator("#pricingMode").selectOption("INQUIRY");
    await expect(
      page.getByText("با ذخیره، ۱ ترکیب", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
    await page.waitForURL("**/admin/products");

    const after = await db().product.findUniqueOrThrow({
      where: { id: product.id },
      include: { variants: true },
    });
    expect(after.pricingMode).toBe("INQUIRY");
    expect(after.variants).toHaveLength(1);
    expect(after.variants[0]!.isActive).toBe(false);
    await admin.close();
  });

  test("تنظیمات کسب‌وکار: ذخیره و نمایش دوباره", async ({ browser }) => {
    const admin = await browser.newContext();
    const page = await admin.newPage();
    await loginWithPassword(page, ADMIN_PHONE, ADMIN_PASSWORD, "/admin");

    const before = await db().setting.findUnique({
      where: { key: "business.pickupHours" },
    });
    try {
      await page.goto("/admin/settings/business");
      await page.locator("#biz-pickupHours").fill("۱۰ تا ۱۸ (تست)");
      await page.getByRole("button", { name: "ذخیره" }).click();
      await expect(page.getByText("تنظیمات ذخیره شد.")).toBeVisible();
      const saved = await db().setting.findUniqueOrThrow({
        where: { key: "business.pickupHours" },
      });
      expect(saved.value).toBe("۱۰ تا ۱۸ (تست)");

      // صفحه‌ی متن‌های اصلی هم باز می‌شود
      await page.goto("/admin/settings/home");
      await expect(
        page.getByText("«شارژ کپسول چطور انجام می‌شود؟»"),
      ).toBeVisible();
    } finally {
      if (before) {
        await db().setting.update({
          where: { key: "business.pickupHours" },
          data: { value: before.value as never },
        });
      }
    }
    await admin.close();
  });
});
