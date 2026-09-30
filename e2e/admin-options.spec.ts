import { expect, type Page, test } from "@playwright/test";

import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  db,
  loginWithPassword,
  RUN_ID,
} from "./support";

/**
 * P0 (SEO.md §۴.۴): ادمین «شارژ ۱۱» و «خرید ۱۱» را با گروه گزینه می‌سازد،
 * «ساخت همه‌ی ترکیب‌ها» تکراری نمی‌سازد، «محاسبه‌ی قیمت پرشده» از شارژ متناظر
 * قیمت می‌گیرد و «کپی محصول» نسخه‌ی غیرفعال می‌سازد.
 */

const slug = (name: string) => `e2e-p0-${name}-${RUN_ID}`;
const CATEGORY_LABEL = "دسته‌ی تست e2e";

async function startProduct(page: Page, key: string, name: string) {
  await page.goto("/admin/products/new");
  await page.locator("#name").fill(name);
  await page.locator("#slug").fill(slug(key));
  await page.locator("#categoryId").selectOption({ label: CATEGORY_LABEL });
}

async function addGroup(
  page: Page,
  index: number,
  group: { name: string; code: string; values: [string, string][] },
) {
  await page.getByRole("button", { name: "افزودن گروه گزینه" }).click();
  await page
    .getByLabel(/^نام گروه/)
    .nth(index)
    .fill(group.name);
  await page.getByLabel("کد گروه (لاتین)").nth(index).fill(group.code);
  for (const [i, [label, code]] of group.values.entries()) {
    if (i > 0) {
      await page
        .getByRole("button", { name: "افزودن مقدار" })
        .nth(index)
        .click();
    }
    await page
      .getByLabel(/^برچسب/)
      .nth(i)
      .fill(label);
    await page
      .getByLabel(/^کد \(لاتین\)/)
      .nth(i)
      .fill(code);
  }
}

test.describe.serial("پنل ادمین: گزینه‌ها و ترکیب‌ها", () => {
  test.afterAll(async () => {
    await db().product.updateMany({
      where: { slug: { startsWith: "e2e-p0-", endsWith: RUN_ID } },
      data: { pairedProductId: null },
    });
    await db().product.deleteMany({
      where: { slug: { startsWith: "e2e-p0-" } },
    });
  });

  test("شارژ ۱۱، خرید ۱۱، قیمت پرشده و کپی", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginWithPassword(page, ADMIN_PHONE, ADMIN_PASSWORD, "/admin");

    // ── شارژ ۱۱: دو ترکیب پرسی/بوتان ──
    await startProduct(page, "charge-11", "شارژ ۱۱ کیلویی");
    await addGroup(page, 0, {
      name: "نوع شیر",
      code: "valve",
      values: [
        ["پرسی", "persi"],
        ["بوتان", "butane"],
      ],
    });
    await page.getByRole("button", { name: "ساخت همه‌ی ترکیب‌ها" }).click();
    await expect(page.getByText("۲ ترکیب جدید")).toBeVisible();
    // دوباره زدن: چیزی اضافه نمی‌شود
    await page.getByRole("button", { name: "ساخت همه‌ی ترکیب‌ها" }).click();
    await expect(page.getByText("از قبل ساخته شده‌اند")).toBeVisible();
    await expect(page.getByLabel("قیمت (تومان)")).toHaveCount(2);

    await page.getByLabel("قیمت (تومان)").nth(0).fill("3400000");
    await page.getByLabel("قیمت (تومان)").nth(1).fill("3400000");
    await page.getByLabel("وزن ارسال (گرم)").nth(0).fill("27000");
    await page.getByLabel("وزن ارسال (گرم)").nth(1).fill("27000");
    await page.getByRole("switch", { name: "فعال بودن پرسی در سایت" }).click();
    await page.getByRole("switch", { name: "فعال بودن بوتان در سایت" }).click();
    await page.getByRole("button", { name: "ساخت محصول" }).click();
    await page.waitForURL(/\/admin\/products\/[^/]+\/edit$/);

    const charge = await db().product.findUniqueOrThrow({
      where: { slug: slug("charge-11") },
      include: { variants: true },
    });
    expect(charge.variants.map((v) => v.optionKey).sort()).toEqual([
      "valve:butane",
      "valve:persi",
    ]);
    expect(
      charge.variants.every((v) => v.isActive && v.price === 3_400_000),
    ).toBe(true);

    // ── خرید ۱۱: خالی فعال با قیمت، پرشده ساخته ولی بدون قیمت ──
    await startProduct(page, "buy-11", "خرید کپسول ۱۱ کیلویی");
    await addGroup(page, 0, {
      name: "وضعیت تحویل",
      code: "fill",
      values: [
        ["خالی", "empty"],
        ["پرشده", "filled"],
      ],
    });
    await page.getByRole("button", { name: "ساخت همه‌ی ترکیب‌ها" }).click();
    await page.getByLabel("قیمت (تومان)").nth(0).fill("3400000");
    await page.getByLabel("وزن ارسال (گرم)").nth(0).fill("20000");
    await page.getByLabel("وزن ارسال (گرم)").nth(1).fill("27000");
    await page.getByRole("switch", { name: "فعال بودن خالی در سایت" }).click();
    await page.locator("#pairedProductId").selectOption({ label: charge.name });
    await page.getByRole("button", { name: "ساخت محصول" }).click();
    await page.waitForURL(/\/admin\/products\/[^/]+\/edit$/);

    const buy = await db().product.findUniqueOrThrow({
      where: { slug: slug("buy-11") },
      include: { variants: true },
    });
    expect(buy.pairedProductId).toBe(charge.id);
    expect(
      (await db().product.findUniqueOrThrow({ where: { id: charge.id } }))
        .pairedProductId,
    ).toBe(buy.id);
    const filled = buy.variants.find((v) => v.optionKey === "fill:filled")!;
    expect(filled).toMatchObject({ price: 0, isActive: false });

    // ── محاسبه‌ی قیمت پرشده: ۳٬۴۰۰٬۰۰۰ + ۳٬۴۰۰٬۰۰۰ = ۶٬۸۰۰٬۰۰۰ ──
    await page.getByRole("button", { name: "محاسبه‌ی قیمت پرشده" }).click();
    await expect(page.getByText("قیمت پرشده پیشنهاد شد")).toBeVisible();
    await expect(page.getByLabel("قیمت (تومان)").nth(1)).toHaveValue("6800000");
    await page.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
    await page.waitForURL("**/admin/products");
    expect(
      (
        await db().productVariant.findUniqueOrThrow({
          where: { id: filled.id },
        })
      ).price,
    ).toBe(6_800_000);

    // ── قیمت‌های شارژ متفاوت ⇒ هشدار و پر نمی‌شود ──
    await db().productVariant.updateMany({
      where: { productId: charge.id, optionKey: "valve:butane" },
      data: { price: 3_600_000 },
    });
    await db().productVariant.update({
      where: { id: filled.id },
      data: { price: 0 },
    });
    await page.goto(`/admin/products/${buy.id}/edit`);
    await page.getByRole("button", { name: "محاسبه‌ی قیمت پرشده" }).click();
    await expect(
      page.getByText("قیمت شارژ پرسی و بوتان متفاوت است"),
    ).toBeVisible();
    await expect(page.getByLabel("قیمت (تومان)").nth(1)).toHaveValue("");

    // ── کپی محصول ──
    await page.getByRole("button", { name: /^کپی محصول/ }).click();
    // از همان صفحه‌ی ویرایش شروع می‌کنیم؛ باید به ویرایش «کپی» برویم
    await expect(page).not.toHaveURL(new RegExp(`${buy.id}/edit$`));
    const copy = await db().product.findUniqueOrThrow({
      where: { slug: `${slug("buy-11")}-copy` },
      include: { variants: true, options: true },
    });
    expect(copy).toMatchObject({
      isActive: false,
      focusKeyword: null,
      pairedProductId: null,
    });
    expect(copy.name).toBe(`${buy.name} (کپی)`);
    expect(copy.options).toHaveLength(1);
    expect(copy.variants).toHaveLength(2);
    await context.close();
  });
});
