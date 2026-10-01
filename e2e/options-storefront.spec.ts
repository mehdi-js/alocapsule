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
 * P1 (SEO.md §۴.۵–۴.۸): گزینه‌ها در فروشگاه. رندر اولیه بدون JS، پارامتر URL،
 * canonical، سوییچ اندازه، جدول قیمت hub، ردیف ارسال و خرید با ارسال فوری.
 */

const PHONE = `0999888${RUN_ID.slice(-4).padStart(4, "0")}`;
const PASSWORD = `Mo${RUN_ID}p`;
const CONSENT = "شرایط تعویض کپسول را خوانده‌ام و می‌پذیرم";
const slug = (name: string) => `e2e-p1-${name}-${RUN_ID}`;
const EXPRESS = `فوری e2e ${RUN_ID}`;

const refillName = (size: string) => `شارژ تست ${RUN_ID} ${size} کیلویی`;
const buyName = (size: string) => `خرید تست ${RUN_ID} ${size} کیلویی`;

const valveOption = {
  create: {
    name: "نوع شیر",
    code: "valve",
    sortOrder: 0,
    values: {
      create: [
        { label: "پرسی", code: "persi", sortOrder: 0 },
        { label: "بوتان", code: "butane", sortOrder: 1 },
      ],
    },
  },
};
const fillOption = {
  create: {
    name: "وضعیت تحویل",
    code: "fill",
    sortOrder: 0,
    values: {
      create: [
        { label: "خالی", code: "empty", sortOrder: 0 },
        { label: "پرشده", code: "filled", sortOrder: 1 },
      ],
    },
  },
};

async function tehranHour(): Promise<number> {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return Number(hour);
}

async function setHours(open: number, close: number) {
  for (const [key, value] of [
    ["business.openHour", open],
    ["business.closeHour", close],
  ] as const) {
    await db().setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

test.describe.serial("فروشگاه: گزینه‌ها، جدول و ارسال فوری", () => {
  let customer: BrowserContext;
  let categories: string[] = [];
  let expressId = "";
  const savedSettings = new Map<string, unknown>();

  test.beforeAll(async () => {
    const prisma = db();
    for (const key of ["business.openHour", "business.closeHour"]) {
      const row = await prisma.setting.findUnique({ where: { key } });
      if (row) savedSettings.set(key, row.value);
    }

    const refillCat = await prisma.category.create({
      data: {
        name: `شارژ نمونه ${RUN_ID}`,
        slug: slug("refill-cat"),
        isActive: true,
      },
    });
    const buyCat = await prisma.category.create({
      data: {
        name: `خرید نمونه ${RUN_ID}`,
        slug: slug("buy-cat"),
        isActive: true,
      },
    });
    categories = [refillCat.id, buyCat.id];

    const variant = (
      optionKey: string,
      title: string,
      price: number,
      sortOrder: number,
    ) => ({ optionKey, title, price, shippingWeightGrams: 27_000, sortOrder });

    for (const [size, persi, butane, order] of [
      ["۱۱", 3_400_000, 3_500_000, 1],
      ["۲۵", 7_000_000, 7_100_000, 2],
    ] as const) {
      const code = size === "۱۱" ? "11" : "25";
      const product = await prisma.product.create({
        data: {
          name: refillName(size),
          slug: slug(`refill-${code}`),
          categoryId: refillCat.id,
          kind: "SERVICE",
          sortOrder: order,
          priceUpdatedAt: new Date(),
          options: valveOption,
          variants: {
            create: [
              variant("valve:persi", "پرسی", persi, 0),
              variant("valve:butane", "بوتان", butane, 1),
            ],
          },
        },
        include: {
          options: { include: { values: true } },
          variants: true,
        },
      });
      const values = product.options[0]!.values;
      for (const v of product.variants) {
        const code2 = v.optionKey.split(":")[1]!;
        await prisma.variantOptionValue.create({
          data: {
            variantId: v.id,
            optionValueId: values.find((x) => x.code === code2)!.id,
          },
        });
      }
    }

    for (const [size, empty, filled, order] of [
      ["۱۱", 3_400_000, 6_800_000, 1],
      ["۲۵", 6_000_000, 13_000_000, 2],
    ] as const) {
      const code = size === "۱۱" ? "11" : "25";
      const product = await prisma.product.create({
        data: {
          name: buyName(size),
          slug: slug(`buy-${code}`),
          categoryId: buyCat.id,
          sortOrder: order,
          priceUpdatedAt: new Date(),
          options: fillOption,
          variants: {
            create: [
              variant("fill:empty", "خالی", empty, 0),
              variant("fill:filled", "پرشده", filled, 1),
            ],
          },
        },
        include: { options: { include: { values: true } }, variants: true },
      });
      const values = product.options[0]!.values;
      for (const v of product.variants) {
        const code2 = v.optionKey.split(":")[1]!;
        await prisma.variantOptionValue.create({
          data: {
            variantId: v.id,
            optionValueId: values.find((x) => x.code === code2)!.id,
          },
        });
      }
    }

    const express = await prisma.shippingMethod.create({
      data: {
        name: EXPRESS,
        cost: 150_000,
        businessHoursOnly: true,
        deliveryEstimate: "۱ تا ۴ ساعت",
        sortOrder: 0,
      },
    });
    expressId = express.id;
  });

  test.afterAll(async () => {
    await customer?.close();
    const prisma = db();
    for (const key of ["business.openHour", "business.closeHour"]) {
      if (savedSettings.has(key)) {
        await prisma.setting.update({
          where: { key },
          data: { value: savedSettings.get(key) as never },
        });
      } else {
        await prisma.setting.deleteMany({ where: { key } });
      }
    }
    const user = await prisma.user.findUnique({ where: { phone: PHONE } });
    if (user) {
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
    }
    await prisma.product.deleteMany({
      where: { slug: { startsWith: "e2e-p1-", endsWith: RUN_ID } },
    });
    await prisma.category.deleteMany({ where: { id: { in: categories } } });
    // سقف ارسال کد OTP بین ثبت‌نام‌های اسپک‌ها (اسپک بعدی هم ثبت‌نام می‌کند)
    await prisma.rateLimitEvent.deleteMany({});
    await prisma.shippingMethod.deleteMany({ where: { id: expressId } });
  });

  test("HTML اولیه بدون JS: گزینه‌ی انتخاب‌شده، قیمت، canonical و پارامتر نامعتبر", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(`/products/${slug("refill-25")}?valve=butane`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      refillName("۲۵"),
    );
    await expect(
      page.getByRole("button", { name: "بوتان", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "پرسی", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("۷,۱۰۰,۰۰۰ تومان").first()).toBeVisible();
    // canonical بدون پارامتر
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toMatch(new RegExp(`/products/${slug("refill-25")}$`));

    // پارامتر نامعتبر ⇒ پیش‌فرض (پرسی)، بدون خطا
    const response = await page.goto(
      `/products/${slug("refill-25")}?valve=xyz`,
    );
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "پرسی", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    // جدول قیمت کوچک صفحه‌ی محصول
    await expect(page.locator("[data-price-table] table")).toHaveCount(1);
    await context.close();
  });

  test("سوییچ اندازه پارامتر گزینه را حفظ می‌کند؛ محصول تک‌دسته‌ای سوییچ ندارد", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/products/${slug("refill-11")}?valve=butane`);
    const nav = page.locator("[data-size-switch]");
    await expect(nav.getByRole("link")).toHaveCount(2);
    await expect(nav.getByRole("link", { name: "۲۵" })).toHaveAttribute(
      "href",
      `/products/${slug("refill-25")}?valve=butane`,
    );
    await expect(nav.getByRole("link", { name: "۱۱" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await context.close();
  });

  test("جدول hub شارژ و خرید در HTML اولیه", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(`/category/${slug("refill-cat")}`);
    const table = page.locator("[data-price-table] table");
    await expect(table.locator("tbody tr")).toHaveCount(2);
    await expect(
      table.getByRole("columnheader", { name: "پرسی" }),
    ).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "بوتان" }),
    ).toBeVisible();
    await expect(
      table.getByRole("rowheader").first().getByRole("link"),
    ).toHaveAttribute("href", `/products/${slug("refill-11")}`);
    await expect(table.locator("caption")).toHaveCount(1);

    await page.goto(`/category/${slug("buy-cat")}`);
    const buy = page.locator("[data-price-table] table");
    await expect(buy.locator("tbody tr")).toHaveCount(2);
    await expect(buy.getByRole("columnheader", { name: "خالی" })).toBeVisible();
    await expect(
      buy.getByRole("columnheader", { name: "پرشده" }),
    ).toBeVisible();
    await expect(
      buy.getByRole("link", { name: "۶,۸۰۰,۰۰۰ تومان" }),
    ).toHaveAttribute("href", `/products/${slug("buy-11")}?fill=filled`);
    await context.close();
  });

  test("انتخاب گزینه با JS: قیمت و URL همگام می‌شوند (بدون ورودی تاریخچه)", async ({
    page,
  }) => {
    await page.goto(`/products/${slug("buy-11")}`);
    await expect(page.getByText("۳,۴۰۰,۰۰۰ تومان").first()).toBeVisible();
    const before = await page.evaluate(() => history.length);
    await page.getByRole("button", { name: "پرشده", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`\\?fill=filled$`));
    await expect(page.getByText("۶,۸۰۰,۰۰۰ تومان").first()).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  test("ردیف اطلاعات ارسال از روش‌های فعال؛ غیرفعال‌کردن فوری آن را حذف می‌کند", async ({
    page,
  }) => {
    await page.goto(`/products/${slug("buy-11")}`);
    const row = page.locator("[data-shipping-info]");
    await expect(row).toContainText(`${EXPRESS}: ۱ تا ۴ ساعت`);

    await db().shippingMethod.update({
      where: { id: expressId },
      data: { isActive: false },
    });
    await page.goto(`/products/${slug("buy-11")}`);
    await expect(page.locator("[data-shipping-info]")).not.toContainText(
      EXPRESS,
    );
    await db().shippingMethod.update({
      where: { id: expressId },
      data: { isActive: true },
    });
  });

  async function checkoutFlow(page: Page) {
    await page.goto("/checkout");
    await page.getByLabel("نام گیرنده").fill("مشتری گزینه");
    await page.getByLabel("نشانی کامل").fill("تهران، خیابان آزمایش، پلاک ۳۰");
    await page.getByRole("button", { name: "ذخیره‌ی آدرس" }).click();
    await expect(
      page.getByRole("radio", { name: /مشتری گزینه/ }),
    ).toBeChecked();
  }

  function submit(page: Page) {
    return page
      .getByRole("complementary", { name: "خلاصه سفارش" })
      .getByRole("button", { name: "ثبت سفارش" });
  }

  test("خارج از ساعات کاری: ارسال فوری غیرفعال و قابل مشاهده با توضیح", async ({
    browser,
  }) => {
    customer = await browser.newContext();
    const page = await customer.newPage();
    await db().rateLimitEvent.deleteMany({});
    await signUpWithOtp(page, PHONE, PASSWORD, "/");

    const h = await tehranHour();
    if (h < 22) await setHours(h + 1, h + 2);
    else await setHours(1, 2);

    await page.goto(`/products/${slug("buy-11")}?fill=filled`);
    await page
      .getByRole("button", { name: "افزودن به سبد خرید" })
      .first()
      .click();
    await expect(page.getByText("به سبد خرید اضافه شد")).toBeVisible();

    await checkoutFlow(page);
    const radio = page.getByRole("radio", { name: new RegExp(EXPRESS) });
    await expect(radio).toBeDisabled();
    await expect(
      page.getByText("فقط در ساعات کاری", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("زمان تحویل: ۱ تا ۴ ساعت")).toBeVisible();
    await expect(page.locator("#shipping-area-note")).toContainText("تهران");
  });

  test("خرید «خرید ۱۱ · پرشده» + «شارژ ۲۵ · بوتان» با ارسال فوری تا تأیید ادمین", async ({
    browser,
  }) => {
    await setHours(0, 24);
    const page = await customer.newPage();

    await page.goto(`/products/${slug("refill-25")}?valve=butane`);
    await page
      .getByRole("button", { name: "افزودن به سبد خرید" })
      .first()
      .click();
    await expect(page.getByText("به سبد خرید اضافه شد")).toBeVisible();

    await page.goto("/checkout");
    const radio = page.getByRole("radio", { name: new RegExp(EXPRESS) });
    await expect(radio).toBeEnabled();
    await radio.check();
    await page.getByLabel(CONSENT, { exact: false }).check();
    await submit(page).click();
    await page.waitForURL("**/checkout/success/**");
    const orderNumber = decodeURIComponent(page.url().split("/").pop() ?? "");

    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber },
      include: { items: { orderBy: { unitPrice: "asc" } } },
    });
    expect(order.shippingMethodName).toBe(EXPRESS);
    expect(order.items.map((i) => i.variantTitle)).toEqual(["پرشده", "بوتان"]);
    expect(order.items.map((i) => i.optionsSnapshot)).toEqual([
      [{ option: "وضعیت تحویل", value: "پرشده" }],
      [{ option: "نوع شیر", value: "بوتان" }],
    ]);

    // نمایش در پنل کاربر
    await page.goto(`/account/orders/${encodeURIComponent(orderNumber)}`);
    await expect(
      page.getByText(`${buyName("۱۱")} (پرشده)`, { exact: false }),
    ).toBeVisible();

    // رسید و تأیید ادمین
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
    await expect(
      adminPage.getByText(`۱ × ${refillName("۲۵")} · بوتان`),
    ).toBeVisible();
    await adminPage.getByRole("button", { name: "تأیید پرداخت" }).click();
    await adminPage.getByRole("button", { name: "بله، تأیید شود" }).click();
    await expect(
      adminPage.getByText("پرداخت تأیید شد و سفارش به آماده‌سازی رفت."),
    ).toBeVisible();
    await admin.close();
    expect(
      (await db().order.findUniqueOrThrow({ where: { orderNumber } })).status,
    ).toBe("PROCESSING");
  });
});
