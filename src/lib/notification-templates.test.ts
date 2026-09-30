import { describe, expect, it, vi } from "vitest";

import {
  buildSmsArgs,
  DEFAULT_TEMPLATES,
  DEFAULT_VARIABLES,
  orderVariableValues,
  renderTemplate,
  SMS_TYPES,
  templateError,
} from "@/lib/notification-templates";
import { ConsoleSmsProvider } from "@/lib/sms/console-provider";
import { smsSettingsSchema } from "@/lib/validation/sms-settings";

const values = orderVariableValues({
  orderNumber: "AL-14050701-0003",
  grandTotal: 1_250_000,
  trackingCode: "RR123;456",
  customerName: "مریم احمدی",
  customerPhone: "09121234567",
});

const byType = <T>(make: (type: (typeof SMS_TYPES)[number]) => T) =>
  Object.fromEntries(SMS_TYPES.map((type) => [type, make(type)])) as Record<
    (typeof SMS_TYPES)[number],
    T
  >;

const validSettings = () => ({
  templates: byType((type) => DEFAULT_TEMPLATES[type]),
  variables: byType((type) => [...DEFAULT_VARIABLES[type]]),
  patterns: byType(() => ""),
  adminPhone: "",
});

describe("متغیرهای پیامک (قالب ملی پیامک: از {0})", () => {
  it("مقادیر به ترتیب تنظیم‌شده، مبلغ با ارقام لاتین و کاما، بدون `;`", () => {
    expect(buildSmsArgs(DEFAULT_VARIABLES.ORDER_PLACED, values)).toEqual([
      "مریم احمدی",
      "AL-14050701-0003",
      "1,250,000",
    ]);
    expect(buildSmsArgs(DEFAULT_VARIABLES.ORDER_SHIPPED, values)).toEqual([
      "مریم احمدی",
      "AL-14050701-0003",
      "RR123 456",
    ]);
    // ترتیب دلخواه ادمین
    expect(
      buildSmsArgs(["amount", "customerPhone", "orderNumber"], values),
    ).toEqual(["1,250,000", "09121234567", "AL-14050701-0003"]);
    expect(buildSmsArgs(["code"], { code: "482913" })).toEqual(["482913"]);
  });

  it("نام خالی ⇒ «مشتری»؛ نام بلند کوتاه می‌شود", () => {
    const base = {
      orderNumber: "A",
      grandTotal: 1,
      trackingCode: null,
      customerPhone: "0912",
    };
    expect(
      orderVariableValues({ ...base, customerName: " " }).customerName,
    ).toBe("مشتری");
    expect(
      orderVariableValues({ ...base, customerName: "ن".repeat(80) })
        .customerName,
    ).toHaveLength(30);
  });

  it("جایگذاری از صفر و همه‌ی متن‌های پیش‌فرض معتبرند", () => {
    expect(renderTemplate("سفارش {0} کد {1} و {2}", ["A", "B"])).toBe(
      "سفارش A کد B و {2}",
    );
    for (const type of SMS_TYPES) {
      expect(
        templateError(DEFAULT_TEMPLATES[type], DEFAULT_VARIABLES[type].length),
      ).toBeNull();
    }
  });

  it("متغیر جاافتاده یا اضافه رد می‌شود", () => {
    expect(templateError("{0} سفارش {1} ثبت شد", 3)).toContain("{2}");
    expect(templateError("{0} سفارش {1} و {2}", 2)).toContain("تعریف نشده");
    expect(templateError("{1} سفارش {2}", 2)).not.toBeNull();
    expect(templateError("متن بدون متغیر", 0)).toBeNull();
  });
});

describe("تنظیمات پیامک از پنل", () => {
  it("پیش‌فرض‌ها معتبرند؛ الگو و شماره‌ی مدیر نرمال می‌شوند", () => {
    const input = validSettings();
    input.patterns.OTP = "۱۲۳۴";
    input.adminPhone = "۰۹۱۲۱۲۳۴۵۶۷";
    const parsed = smsSettingsSchema.parse(input);
    expect(parsed.patterns.OTP).toBe("1234");
    expect(parsed.adminPhone).toBe("09121234567");
  });

  it("ترتیب جدید متغیرها با متن هماهنگ پذیرفته می‌شود", () => {
    const input = validSettings();
    input.variables.ORDER_PLACED = ["orderNumber", "amount"];
    input.templates.ORDER_PLACED =
      "سفارش {0} به مبلغ {1} تومان ثبت شد. alihan.ir";
    expect(smsSettingsSchema.safeParse(input).success).toBe(true);
  });

  it("خطاها: متن ناهمخوان، متغیر غیرمجاز، کد ورود بدون کد، الگو و موبایل نامعتبر", () => {
    const input = validSettings();
    input.templates.ORDER_SHIPPED = "سفارش {0} ارسال شد";
    input.variables.PAYMENT_APPROVED = ["trackingCode"];
    input.variables.OTP = [];
    input.templates.OTP = "کد ورود شما آماده است";
    input.patterns.PAYMENT_REJECTED = "abc";
    input.adminPhone = "12345";
    const result = smsSettingsSchema.safeParse(input);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining([
        "templates.ORDER_SHIPPED",
        "variables.PAYMENT_APPROVED",
        "variables.OTP",
        "patterns.PAYMENT_REJECTED",
        "adminPhone",
      ]),
    );
  });
});

describe("ConsoleSmsProvider", () => {
  it("🔴 متن کامل با مقادیر جایگذاری‌شده را چاپ می‌کند", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const args = buildSmsArgs(DEFAULT_VARIABLES.ORDER_PLACED, values);
    await new ConsoleSmsProvider().sendPattern({
      to: "09121234567",
      patternId: "111",
      args,
      previewText: renderTemplate(DEFAULT_TEMPLATES.ORDER_PLACED, args),
    });
    const output = String(log.mock.calls[0]?.[0]);
    expect(output).toContain(
      "مریم احمدی عزیز، سفارش AL-14050701-0003 به مبلغ 1,250,000 تومان در علی‌حان ثبت شد.",
    );
    log.mockRestore();
  });
});
