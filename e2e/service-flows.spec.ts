import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import sharp from "sharp";

import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  db,
  loginWithPassword,
  RUN_ID,
  signUpWithOtp,
} from "./support";

/**
 * F7: مسیرهای جدید الو کپسول — خرید خدمت با پذیرش شرایط + کارت به کارت +
 * تأیید ادمین؛ خرید مخلوط با تحویل حضوری؛ مشاهده‌ی محصول استعلامی و نبود
 * دکمه‌ی خرید. روی داده‌ی seed (چهار محصول نمونه).
 */

const PHONE = `0999666${RUN_ID.slice(-4).padStart(4, "0")}`;
const PASSWORD = `Mo${RUN_ID}s`;
const CONSENT = "شرایط تعویض کپسول را خوانده‌ام و می‌پذیرم";

test.describe.serial("مسیرهای الو کپسول", () => {
  let customer: BrowserContext;

  test.afterAll(async () => {
    await customer?.close();
    const prisma = db();
    const user = await prisma.user.findUnique({ where: { phone: PHONE } });
    if (!user) return;
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    const payments = await prisma.payment.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: user.id },
          { entityId: { in: [...orderIds, ...payments.map((p) => p.id)] } },
        ],
      },
    });
    await prisma.notificationLog.deleteMany({ where: { userId: user.id } });
    await prisma.walletTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.cart.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  async function addToCart(page: Page, slug: string) {
    await page.goto(`/products/${slug}`);
    await page
      .getByRole("button", { name: "افزودن به سبد خرید" })
      .first()
      .click();
    await expect(page.getByText("به سبد خرید اضافه شد")).toBeVisible();
  }

  async function acceptTerms(page: Page) {
    await page.getByLabel(CONSENT, { exact: false }).check();
  }

  function submit(page: Page) {
    return page
      .getByRole("complementary", { name: "خلاصه سفارش" })
      .getByRole("button", { name: "ثبت سفارش" });
  }

  async function placedOrderNumber(page: Page) {
    await page.waitForURL("**/checkout/success/**");
    return decodeURIComponent(page.url().split("/").pop() ?? "");
  }

  test("۱. خرید خدمت: پذیرش شرایط + پیک + کارت به کارت + تأیید ادمین", async ({
    browser,
  }) => {
    customer = await browser.newContext();
    const page = await customer.newPage();
    await signUpWithOtp(page, PHONE, PASSWORD, "/");
    await addToCart(page, "charge-butane");

    await page.goto("/checkout");
    await page.getByLabel("نام گیرنده").fill("مشتری خدمت");
    await page.getByLabel("نشانی کامل").fill("تهران، خیابان آزمایش، پلاک ۲۰");
    await page.getByRole("button", { name: "ذخیره‌ی آدرس" }).click();
    await expect(page.getByRole("radio").first()).toBeChecked();
    await expect(submit(page)).toBeDisabled();
    await acceptTerms(page);
    await submit(page).click();
    const orderNumber = await placedOrderNumber(page);

    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
      include: { items: true },
    });
    expect(order.serviceTermsAcceptedAt).not.toBeNull();
    expect(order.serviceTermsSnapshot).toContain("همان کپسول خودتان نیست");
    expect(order.items[0]!.productKindSnapshot).toBe("SERVICE");
    expect(order.shippingAddressSnapshot).not.toBeNull();

    // رسید کارت به کارت
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
    await page.getByRole("button", { name: "ثبت رسید پرداخت" }).click();
    await expect(
      page.getByText("رسید شما ثبت شد و در حال بررسی است", { exact: false }),
    ).toBeVisible();

    // ادمین تأیید می‌کند و «کپسول خالی قابل تحویل گرفتن» را می‌بیند
    const admin = await browser.newContext();
    const adminPage = await admin.newPage();
    await loginWithPassword(
      adminPage,
      ADMIN_PHONE,
      ADMIN_PASSWORD,
      "/admin/payments",
    );
    await adminPage.waitForURL("**/admin/payments");
    await adminPage
      .getByRole("row")
      .filter({ hasText: orderNumber })
      .getByRole("link", { name: "بررسی" })
      .click();
    await expect(
      adminPage.getByText("کپسول‌های خالی قابل تحویل گرفتن"),
    ).toBeVisible();
    await expect(adminPage.getByText("۱ × شارژ کپسول گاز بوتان")).toBeVisible();
    await adminPage.getByRole("button", { name: "تأیید پرداخت" }).click();
    await adminPage.getByRole("button", { name: "بله، تأیید شود" }).click();
    await expect(
      adminPage.getByText("پرداخت تأیید شد و سفارش به آماده‌سازی رفت."),
    ).toBeVisible();
    await admin.close();

    const approved = await db().order.findUniqueOrThrow({
      where: { orderNumber },
    });
    expect(approved.status).toBe("PROCESSING");
    expect(approved.paidAt).not.toBeNull();
  });

  test("۲. خرید مخلوط (خدمت + کالا) با تحویل حضوری", async () => {
    const page = await customer.newPage();
    await addToCart(page, "charge-butane");
    await addToCart(page, "buy-cylinder-11kg");

    await page.goto("/checkout");
    await page.getByRole("radio", { name: /تحویل حضوری/ }).check();
    await expect(page.getByLabel("نشانی کامل")).toHaveCount(0);
    await expect(page.getByText("محل تحویل:")).toBeVisible();
    await expect(submit(page)).toBeDisabled();
    await acceptTerms(page);
    await submit(page).click();
    const orderNumber = await placedOrderNumber(page);

    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
      include: { items: true },
    });
    expect(order.shippingAddressSnapshot).toBeNull();
    expect(order.shippingTotal).toBe(0);
    expect(order.items.map((i) => i.productKindSnapshot).sort()).toEqual([
      "PHYSICAL",
      "SERVICE",
    ]);
    expect(order.serviceTermsSnapshot).not.toBeNull();
    await page.close();
  });

  test("۳. محصول استعلامی: جعبه‌ی استعلام، تماس و بدون دکمه‌ی خرید", async ({
    browser,
  }) => {
    const shop = await browser.newContext();
    const page = await shop.newPage();
    await page.goto("/products/charge-oxygen-40kg");
    await expect(
      page.getByRole("heading", { name: "استعلام قیمت" }),
    ).toBeVisible();
    await expect(
      page.locator(
        'section[aria-labelledby="inquiry-heading"] a[href^="tel:+98"]',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "افزودن به سبد خرید" }),
    ).toHaveCount(0);

    // در لیست فروشگاه هم «استعلام قیمت» و بدون دکمه‌ی افزودن
    await page.goto("/products");
    const card = page
      .locator("article")
      .filter({ hasText: "شارژ کپسول اکسیژن ۴۰ کیلویی" });
    await expect(card.getByText("استعلام قیمت", { exact: true })).toBeVisible();
    await expect(card.getByRole("button")).toHaveCount(0);
    await shop.close();
  });
});
