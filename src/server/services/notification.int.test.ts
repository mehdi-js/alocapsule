import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "@/lib/db";
import {
  type Catalog,
  cleanupFixtures,
  createAdmin,
  createCatalog,
  createCustomer,
  fillCart,
  placeOrder,
  receiptPng,
} from "@/test/order-fixtures";
import { setAsideSettings } from "@/test/settings-snapshot";

import {
  retryFailedNotifications,
  sendOrderNotification,
} from "./notification.service";
import { shipOrder } from "./order-fulfillment.service";
import { submitReceipt } from "./payment.service";
import { approvePayment } from "./payment-review.service";
import { getSmsSettings, saveSmsSettings } from "./sms-settings.service";

/**
 * ملی پیامکِ واقعی (MelipayamakProvider) با fetch ساختگی: پاسخ «0» همان پاسخ
 * ملی پیامک به نام کاربری/رمز نامعتبر است؛ هیچ درخواستی به اینترنت نمی‌رود.
 */
const sms = vi.hoisted(() => ({
  mode: "ok" as "ok" | "bad-credentials",
  requests: [] as URLSearchParams[],
}));

vi.mock("./sms-connection.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./sms-connection.service")>();
  const { MelipayamakProvider } =
    await import("@/lib/sms/melipayamak-provider");
  const provider = new MelipayamakProvider({
    username: "wrong-user",
    password: "wrong-pass",
    fetchImpl: (async (_url: string, init?: RequestInit) => {
      sms.requests.push(init?.body as URLSearchParams);
      const value = sms.mode === "ok" ? "123456789012345678" : "0";
      return new Response(
        `<string xmlns="http://tempuri.org/">${value}</string>`,
      );
    }) as typeof fetch,
  });
  return { ...actual, getSmsProvider: async () => provider };
});

let catalog: Catalog;
let adminId: string;
/** نام گیرنده‌ی آدرس fixture (متغیر {0} پیامک‌های مشتری) */
const RECEIVER = "گیرنده‌ی تست";
/** گیرنده‌ی پیامک‌های مدیر در این تست */
const ADMIN_SMS_PHONE = "09990001122";

let restoreSettings: () => Promise<void>;

beforeAll(async () => {
  restoreSettings = await setAsideSettings([
    "sms.templates",
    "sms.variables",
    "sms.patterns",
    "sms.adminPhone",
  ]);
  process.env.SMS_PATTERN_ORDER_PLACED = "111";
  process.env.SMS_PATTERN_PAYMENT_APPROVED = "222";
  process.env.SMS_PATTERN_ORDER_SHIPPED = "444";
  process.env.SMS_PATTERN_ADMIN_RECEIPT_SUBMITTED = "555";
  process.env.SMS_ADMIN_PHONE = ADMIN_SMS_PHONE;
  catalog = await createCatalog();
  adminId = await createAdmin();
});

beforeEach(() => {
  sms.mode = "ok";
  sms.requests.length = 0;
});

afterAll(async () => {
  // لاگ‌های مدیر به کاربری وصل نیستند و با fixtureها پاک نمی‌شوند
  await db.notificationLog.deleteMany({ where: { phone: ADMIN_SMS_PHONE } });
  await restoreSettings();
  await cleanupFixtures();
});

async function newOrder() {
  const customer = await createCustomer();
  await fillCart(customer, [[catalog.small, 1]]);
  const placed = await placeOrder(customer, catalog.post);
  return { customer, ...placed };
}

function logsOf(orderId: string) {
  return db.notificationLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });
}

/** سفارش پرداخت‌شده (رسید + تأیید ادمین) برای تست ارسال */
async function paidOrder() {
  const order = await newOrder();
  await submitReceipt({
    userId: order.customer.userId,
    orderNumber: order.orderNumber,
    file: await receiptPng(),
  });
  const payment = await db.payment.findFirstOrThrow({
    where: { orderId: order.orderId, status: "SUBMITTED" },
  });
  return { ...order, paymentId: payment.id };
}

describe("پیامک سفارش", () => {
  it("🔴 نام کاربری/رمز نامعتبر ملی پیامک ⇒ سفارش ثبت می‌شود و فقط لاگ FAILED", async () => {
    sms.mode = "bad-credentials";
    const { orderId, orderNumber, grandTotal } = await newOrder();

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PENDING_PAYMENT");

    const [log] = await logsOf(orderId);
    expect(log).toMatchObject({
      type: "ORDER_PLACED",
      status: "FAILED",
      attempts: 1,
      providerMessageId: null,
    });
    expect(log!.errorMessage).toBe("0: نام کاربری یا رمز عبور نامعتبر است");
    expect(log!.payload).toMatchObject({
      args: [RECEIVER, orderNumber, grandTotal.toLocaleString("en-US")],
      patternId: "111",
    });
  });

  it("ارسال موفق: کد پاسخ ذخیره می‌شود و متن با ترتیب درست فرستاده می‌شود", async () => {
    const { customer, orderId, orderNumber } = await newOrder();
    const [log] = await logsOf(orderId);
    expect(log).toMatchObject({
      status: "SENT",
      providerMessageId: "123456789012345678",
      attempts: 1,
    });
    expect(log!.sentAt).not.toBeNull();

    const request = sms.requests.at(-1)!;
    expect(request.get("bodyId")).toBe("111");
    expect(request.get("text")).toBe(`${RECEIVER};${orderNumber};490,000`);
    const user = await db.user.findUniqueOrThrow({
      where: { id: customer.userId },
    });
    expect(request.get("to")).toBe(user.phone);
  });

  it("🔴 دوبار تأیید یک پرداخت ⇒ فقط یک پیامک", async () => {
    const { orderId, paymentId } = await paidOrder();
    sms.requests.length = 0;
    await Promise.all([
      approvePayment(adminId, paymentId),
      approvePayment(adminId, paymentId),
    ]);
    await approvePayment(adminId, paymentId);

    const approved = (await logsOf(orderId)).filter(
      (log) => log.type === "PAYMENT_APPROVED",
    );
    expect(approved).toHaveLength(1);
    expect(sms.requests.filter((r) => r.get("bodyId") === "222")).toHaveLength(
      1,
    );

    // فراخوانی مستقیم دوباره‌ی همان رویداد هم پیامک تازه نمی‌فرستد
    await sendOrderNotification("PAYMENT_APPROVED", orderId);
    expect(sms.requests.filter((r) => r.get("bodyId") === "222")).toHaveLength(
      1,
    );
  });

  it("🔴 مقدار شامل `;` ترتیب متغیرهای الگو را خراب نمی‌کند", async () => {
    const { orderId, orderNumber, paymentId } = await paidOrder();
    await approvePayment(adminId, paymentId);
    sms.requests.length = 0;

    await shipOrder(adminId, orderId, "12;34؛56");
    const request = sms.requests.at(-1)!;
    expect(request.get("bodyId")).toBe("444");
    const parts = request.get("text")!.split(";");
    expect(parts).toEqual([RECEIVER, orderNumber, "12 34 56"]);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({
      status: "SHIPPED",
      trackingCode: "12;34؛56",
    });
    expect(order.shippedAt).not.toBeNull();
  });
});

describe("job:retry-notifications", () => {
  it("🔴 ناموفق‌ها دوباره فرستاده می‌شوند و بعد از ۳ تلاش متوقف می‌شوند", async () => {
    sms.mode = "bad-credentials";
    const { orderId, orderNumber } = await newOrder();
    const attemptsOf = async () =>
      (await db.notificationLog.findFirstOrThrow({ where: { orderId } }))
        .attempts;
    const sentForOrder = () =>
      sms.requests.filter((r) => r.get("text")?.includes(orderNumber)).length;
    expect(await attemptsOf()).toBe(1);

    await retryFailedNotifications();
    expect(await attemptsOf()).toBe(2);
    await retryFailedNotifications();
    expect(await attemptsOf()).toBe(3);
    expect(sentForOrder()).toBe(3);

    // پیامکِ به سقف رسیده حتی با سرویس سالم دوباره فرستاده نمی‌شود
    sms.mode = "ok";
    await retryFailedNotifications();
    expect(await attemptsOf()).toBe(3);
    expect(sentForOrder()).toBe(3);
    const [log] = await logsOf(orderId);
    expect(log!.status).toBe("FAILED");
  });

  it("شکست گذرا ⇒ تلاش دوباره موفق می‌شود؛ «در انتظار»ِ گیرکرده هم فرستاده می‌شود", async () => {
    sms.mode = "bad-credentials";
    const failed = await newOrder();
    sms.mode = "ok";

    const stuck = await newOrder();
    await db.notificationLog.updateMany({
      where: { orderId: stuck.orderId },
      data: {
        status: "PENDING",
        attempts: 1,
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    const summary = await retryFailedNotifications();
    expect(summary.sent).toBeGreaterThanOrEqual(2);
    for (const orderId of [failed.orderId, stuck.orderId]) {
      const [log] = await logsOf(orderId);
      expect(log).toMatchObject({ status: "SENT", attempts: 2 });
    }
  });
});

describe("پیامک مدیر", () => {
  it("رسید جدید ⇒ پیامک به شماره‌ی مدیر با شماره‌ی سفارش، مبلغ و نام مشتری", async () => {
    const { orderId, orderNumber } = await paidOrder();
    const admin = (await logsOf(orderId)).find(
      (log) => log.type === "ADMIN_RECEIPT_SUBMITTED",
    );
    expect(admin).toMatchObject({
      phone: ADMIN_SMS_PHONE,
      userId: null,
      status: "SENT",
    });
    const request = sms.requests.find((r) => r.get("bodyId") === "555")!;
    expect(request.get("to")).toBe(ADMIN_SMS_PHONE);
    expect(request.get("text")).toBe(`${orderNumber};490,000;${RECEIVER}`);
  });

  it("بدون شماره‌ی مدیر، پیامک مدیر ساخته نمی‌شود", async () => {
    process.env.SMS_ADMIN_PHONE = "";
    try {
      const { orderId } = await paidOrder();
      const types = (await logsOf(orderId)).map((log) => log.type);
      expect(types).not.toContain("ADMIN_RECEIPT_SUBMITTED");
      expect(types).toContain("ORDER_PLACED");
    } finally {
      process.env.SMS_ADMIN_PHONE = ADMIN_SMS_PHONE;
    }
  });
});

describe("ترتیب متغیرها از پنل مدیریت", () => {
  it("ترتیب و متن ذخیره‌شده در پنل هنگام ارسال استفاده می‌شود", async () => {
    const settings = await getSmsSettings();
    const current = (key: "template" | "variables" | "patternOverride") =>
      Object.fromEntries(settings.types.map((t) => [t.type, t[key]]));
    try {
      await saveSmsSettings({
        templates: {
          ...current("template"),
          ORDER_PLACED: "سفارش {0} به مبلغ {1} برای {2} ثبت شد. alocapsule.ir",
        } as never,
        variables: {
          ...current("variables"),
          ORDER_PLACED: ["orderNumber", "amount", "customerName"],
        } as never,
        patterns: current("patternOverride") as never,
        adminPhone: "",
      });
      const { orderNumber, orderId } = await newOrder();
      const request = sms.requests.find((r) => r.get("bodyId") === "111")!;
      expect(request.get("text")).toBe(`${orderNumber};490,000;${RECEIVER}`);
      const [log] = await logsOf(orderId);
      expect((log!.payload as { text: string }).text).toBe(
        `سفارش ${orderNumber} به مبلغ 490,000 برای ${RECEIVER} ثبت شد. alocapsule.ir`,
      );
    } finally {
      await db.setting.deleteMany({
        where: {
          key: {
            in: [
              "sms.templates",
              "sms.variables",
              "sms.patterns",
              "sms.adminPhone",
            ],
          },
        },
      });
    }
  });
});
