import { describe, expect, it } from "vitest";

import { defaultBusinessSettings } from "@/lib/business-settings";
import { defaultHomeSettings } from "@/lib/home-settings";
import {
  businessSettingsSchema,
  homeSettingsSchema,
} from "@/lib/validation/store-content";

const business = {
  ...defaultBusinessSettings(),
  orderNumberPrefix: "AC",
};

function businessIssues(input: unknown): Record<string, string> {
  const result = businessSettingsSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

function homeIssues(input: unknown): Record<string, string> {
  const result = homeSettingsSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

describe("businessSettingsSchema: ساعات کاری", () => {
  it("بازه‌ی معتبر ۹ تا ۱۸؛ وارونه یا خارج از محدوده رد می‌شود", () => {
    expect(businessSettingsSchema.safeParse(business).success).toBe(true);
    expect(
      businessIssues({ ...business, openHour: 18, closeHour: 9 }).closeHour,
    ).toBe("ساعت پایان باید بعد از ساعت شروع باشد");
    expect(
      businessIssues({ ...business, openHour: 24 }).openHour,
    ).toBeDefined();
    expect(
      businessIssues({ ...business, closeHour: 0 }).closeHour,
    ).toBeDefined();
    expect(
      businessIssues({ ...business, openHour: Number.NaN }).openHour,
    ).toBeDefined();
  });
});

describe("businessSettingsSchema", () => {
  it("مقدارهای پیش‌فرض معتبرند", () => {
    expect(businessSettingsSchema.safeParse(business).success).toBe(true);
  });

  it("شماره‌ی تماس: ارقام فارسی و خط تیره نرمال می‌شود؛ نامعتبر رد", () => {
    const parsed = businessSettingsSchema.parse({
      ...business,
      phone: "۰۹۱۲-۶۲۷ ۰۵۹۵",
    });
    expect(parsed.phone).toBe("09126270595");
    expect(businessIssues({ ...business, phone: "12" }).phone).toBeTruthy();
    expect(businessIssues({ ...business, phone: "abc" }).phone).toBeTruthy();
  });

  it("واتساپ: خالی، شماره یا https؛ بقیه رد", () => {
    for (const ok of ["", "09121234567", "https://wa.me/989121234567"]) {
      expect(
        businessSettingsSchema.safeParse({ ...business, whatsapp: ok }).success,
      ).toBe(true);
    }
    expect(
      businessIssues({ ...business, whatsapp: "http://x.com" }).whatsapp,
    ).toBeTruthy();
  });

  it("پیشوند شماره‌ی سفارش: حرف بزرگ می‌شود؛ نامعتبر رد", () => {
    expect(
      businessSettingsSchema.parse({ ...business, orderNumberPrefix: "al2" })
        .orderNumberPrefix,
    ).toBe("AL2");
    for (const bad of ["", "2AB", "A-B", "ABCDEFGHI", "علی"]) {
      expect(
        businessIssues({ ...business, orderNumberPrefix: bad })
          .orderNumberPrefix,
        bad,
      ).toBeTruthy();
    }
  });

  it("متن شرایط و برچسب الزامی‌اند و سقف دارند", () => {
    expect(
      businessIssues({ ...business, serviceDefaultTerms: "کوتاه" })
        .serviceDefaultTerms,
    ).toBeTruthy();
    expect(
      businessIssues({ ...business, serviceDefaultTerms: "x".repeat(6000) })
        .serviceDefaultTerms,
    ).toBeTruthy();
    expect(
      businessIssues({ ...business, serviceConsentLabel: "" })
        .serviceConsentLabel,
    ).toBeTruthy();
  });
});

describe("homeSettingsSchema", () => {
  const home = defaultHomeSettings();

  it("مقدارهای پیش‌فرض (با آمار خالی) معتبرند", () => {
    const parsed = homeSettingsSchema.parse(home);
    expect(parsed.stats).toEqual([]);
  });

  it("آمار اختیاری است؛ عدد و برچسب الزامی و حداکثر ۶", () => {
    expect(
      homeSettingsSchema.safeParse({
        ...home,
        stats: [{ label: "سال تجربه", value: "۱۰" }],
      }).success,
    ).toBe(true);
    expect(
      homeIssues({ ...home, stats: [{ label: "", value: "۱" }] })[
        "stats.0.label"
      ],
    ).toBeTruthy();
    expect(
      homeIssues({
        ...home,
        stats: Array.from({ length: 7 }, () => ({
          label: "برچسب",
          value: "۱",
        })),
      }).stats,
    ).toBeTruthy();
  });

  it("مراحل: حداقل ۲ و حداکثر ۶؛ مشتریان حداقل ۱", () => {
    expect(homeIssues({ ...home, steps: [home.steps[0]] }).steps).toBeTruthy();
    expect(
      homeIssues({ ...home, steps: [...home.steps, ...home.steps] }).steps,
    ).toBeTruthy();
    expect(homeIssues({ ...home, customers: [] }).customers).toBeTruthy();
  });

  it("متن‌ها trim می‌شوند و خالی رد می‌شوند", () => {
    expect(
      homeSettingsSchema.parse({ ...home, heroTitle: "  عنوان جدید  " })
        .heroTitle,
    ).toBe("عنوان جدید");
    expect(homeIssues({ ...home, heroTitle: "  " }).heroTitle).toBeTruthy();
  });
});
