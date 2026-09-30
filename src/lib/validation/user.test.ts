import { describe, expect, it } from "vitest";

import {
  adminUserInputSchema,
  profileInputSchema,
  walletAdjustmentSchema,
} from "@/lib/validation/user";

describe("اعتبارسنجی کاربر", () => {
  it("پروفایل: خالی ⇒ null، ایمیل با حروف کوچک", () => {
    expect(profileInputSchema.parse({ fullName: " ", email: "" })).toEqual({
      fullName: null,
      email: null,
    });
    expect(
      profileInputSchema.parse({ fullName: "سارا", email: " Sara@Mail.COM " }),
    ).toEqual({ fullName: "سارا", email: "sara@mail.com" });
    expect(
      profileInputSchema.safeParse({ fullName: "س", email: "x@" }).error?.issues
        .length,
    ).toBe(2);
  });

  it("ادمین: نقش فقط CUSTOMER/ADMIN", () => {
    expect(
      adminUserInputSchema.safeParse({
        fullName: "",
        email: "",
        role: "ROOT",
        isActive: true,
      }).success,
    ).toBe(false);
  });

  it("کیف پول: مبلغ مثبت صحیح و یادداشت اجباری", () => {
    const base = {
      type: "CREDIT",
      amount: 50_000,
      note: "جبران تأخیر ارسال",
      requestId: "6f1c2a8e-0b1d-4f5e-9a3b-2c4d5e6f7a8b",
    };
    expect(walletAdjustmentSchema.safeParse(base).success).toBe(true);
    const bad = walletAdjustmentSchema.safeParse({
      ...base,
      amount: 0,
      note: " ",
      requestId: "x",
    });
    expect(bad.error?.issues.map((i) => i.path[0])).toEqual([
      "amount",
      "note",
      "requestId",
    ]);
  });
});
