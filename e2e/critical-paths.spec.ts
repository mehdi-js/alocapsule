import { type BrowserContext, expect, test } from "@playwright/test";
import sharp from "sharp";

import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  COUPON_CODE,
  CUSTOMER_PASSWORD,
  CUSTOMER_PHONE,
  db,
  E2E_PRODUCT_SLUG,
  loginWithPassword,
  signUpWithOtp,
} from "./support";

/**
 * مسیرهای بحرانی: ثبت‌نام (کد پیامکی + تعیین رمز) ← ثبت سفارش با کد تخفیف
 * ← آپلود رسید ← تأیید ادمین (ورود با رمز) ← ورود دوباره‌ی مشتری با رمز.
 * پشت‌سرهم و روی یک سفارش.
 */

const toPersian = (value: string) =>
  value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹".charAt(Number(d)));

test.describe.serial("مسیرهای بحرانی", () => {
  let customer: BrowserContext;
  let orderNumber = "";

  test.afterAll(async () => {
    await customer?.close();
  });

  test("۱. ثبت‌نام با کد پیامکی و تعیین رمز", async ({ browser }) => {
    customer = await browser.newContext();
    const page = await customer.newPage();
    await signUpWithOtp(page, CUSTOMER_PHONE, CUSTOMER_PASSWORD, "/account");

    await expect(page).toHaveURL(/\/account\/orders$/);
    await expect(page.getByText(toPersian(CUSTOMER_PHONE))).toBeVisible();
    await page.close();
  });

  test("۲. ثبت سفارش با کد تخفیف", async () => {
    const page = await customer.newPage();
    await page.goto(`/products/${E2E_PRODUCT_SLUG}`);
    await page
      .getByRole("button", { name: "افزودن به سبد خرید" })
      .first()
      .click();
    await expect(page.getByText("به سبد خرید اضافه شد")).toBeVisible();

    await page.goto("/cart");
    await page.locator("#coupon-code").fill(COUPON_CODE.toLowerCase());
    await page.getByRole("button", { name: "اعمال" }).click();
    const summary = page.getByRole("complementary", { name: "خلاصه سفارش" });
    // ۱۰٪ از ۱۱۰٬۰۰۰ تومان
    await expect(summary.getByText("−۱۱,۰۰۰ تومان")).toBeVisible();

    await page.getByRole("link", { name: "ادامه و ثبت سفارش" }).click();
    await page.waitForURL("**/checkout");
    await page.getByLabel("نام گیرنده").fill("مشتری آزمایشی");
    await page
      .getByLabel("نشانی کامل")
      .fill("خیابان ولیعصر، کوچه‌ی آزمایش، پلاک ۱۰");
    await page.getByRole("button", { name: "ذخیره‌ی آدرس" }).click();
    await expect(page.getByRole("radio").first()).toBeChecked();

    const checkout = page.getByRole("complementary", { name: "خلاصه سفارش" });
    await expect(checkout.getByText("−۱۱,۰۰۰ تومان")).toBeVisible();
    await checkout.getByRole("button", { name: "ثبت سفارش" }).click();

    await page.waitForURL("**/checkout/success/**");
    orderNumber = decodeURIComponent(page.url().split("/").pop() ?? "");
    await expect(page.getByText("سفارش شما ثبت شد")).toBeVisible();

    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
    });
    expect(order).toMatchObject({
      couponCode: COUPON_CODE,
      subtotal: 110_000,
      discountTotal: 11_000,
      status: "PENDING_PAYMENT",
    });
    expect(order.grandTotal).toBe(
      order.subtotal + order.shippingTotal - order.discountTotal,
    );
    await page.close();
  });

  test("۳. آپلود رسید", async () => {
    const page = await customer.newPage();
    await page.goto(`/checkout/pay/${encodeURIComponent(orderNumber)}`);
    const receipt = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 250, g: 250, b: 245 },
      },
    })
      .png()
      .toBuffer();
    await page.locator("#receipt-file").setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: receipt,
    });
    // فرم رسید فقط تصویر دارد
    await page.getByRole("button", { name: "ثبت رسید پرداخت" }).click();

    await expect(
      page.getByText("رسید شما ثبت شد و در حال بررسی است", { exact: false }),
    ).toBeVisible();
    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
    });
    expect(order.status).toBe("PAYMENT_REVIEW");
    await page.close();
  });

  test("۴. تأیید پرداخت توسط ادمین", async ({ browser }) => {
    const admin = await browser.newContext();
    const page = await admin.newPage();
    await loginWithPassword(
      page,
      ADMIN_PHONE,
      ADMIN_PASSWORD,
      "/admin/payments",
    );
    await page.waitForURL("**/admin/payments");

    const row = page.getByRole("row").filter({ hasText: orderNumber });
    await row.getByRole("link", { name: "بررسی" }).click();
    await expect(
      page.getByRole("img", { name: /رسید پرداخت سفارش/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "تأیید پرداخت" }).click();
    await page.getByRole("button", { name: "بله، تأیید شود" }).click();
    await expect(
      page.getByText("پرداخت تأیید شد و سفارش به آماده‌سازی رفت."),
    ).toBeVisible();
    await admin.close();

    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
      include: { payments: true },
    });
    expect(order.status).toBe("PROCESSING");
    expect(order.paidAt).not.toBeNull();
    expect(order.payments[0]?.status).toBe("APPROVED");

    // مشتری وضعیت تازه را در پنل خود می‌بیند
    const mine = await customer.newPage();
    await mine.goto(`/account/orders/${encodeURIComponent(orderNumber)}`);
    await expect(mine.getByText("در حال آماده‌سازی").first()).toBeVisible();
  });

  test("۵. ورود دوباره با رمز عبور", async ({ browser }) => {
    const fresh = await browser.newContext();
    const page = await fresh.newPage();

    // رمز غلط ⇒ پیام کلی، بدون ورود
    await page.goto("/login");
    await page.getByLabel("شماره‌ی موبایل").fill(CUSTOMER_PHONE);
    await page.getByRole("button", { name: "ادامه" }).click();
    await page.getByLabel("رمز عبور", { exact: true }).fill("Wrong1234");
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await expect(
      page.getByText("شماره‌ی موبایل یا رمز عبور نادرست است."),
    ).toBeVisible();

    await loginWithPassword(
      page,
      CUSTOMER_PHONE,
      CUSTOMER_PASSWORD,
      "/account",
    );
    await expect(page).toHaveURL(/\/account\/orders$/);
    await expect(page.getByText(orderNumber).first()).toBeVisible();
    await fresh.close();
  });
});
