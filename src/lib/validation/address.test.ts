import { describe, expect, it } from "vitest";

import {
  type AddressFormInput,
  addressInputSchema,
} from "@/lib/validation/address";

const base: AddressFormInput = {
  receiverName: " مریم احمدی ",
  receiverPhone: "۰۹۱۲ ۱۲۳ ۴۵۶۷",
  province: "تهران",
  city: "تهران",
  postalCode: "۱۲۳۴۵-۶۷۸۹۰",
  line: "خیابان ولیعصر، کوچه‌ی بهار، پلاک ۱۲، واحد ۳",
  isDefault: true,
};

function errors(input: Partial<AddressFormInput>): Record<string, string> {
  const result = addressInputSchema.safeParse({ ...base, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

describe("addressInputSchema", () => {
  it("نرمال‌سازی موبایل و کد پستی", () => {
    const parsed = addressInputSchema.parse(base);
    expect(parsed.receiverName).toBe("مریم احمدی");
    expect(parsed.receiverPhone).toBe("09121234567");
    expect(parsed.postalCode).toBe("1234567890");
  });

  it("کد پستی اختیاری است", () => {
    expect(
      addressInputSchema.parse({ ...base, postalCode: " " }).postalCode,
    ).toBeNull();
    expect(errors({ postalCode: "12345" }).postalCode).toBe(
      "کد پستی باید ۱۰ رقم باشد",
    );
  });

  it("خارج از منطقه‌ی تحت پوشش رد می‌شود", () => {
    expect(errors({ province: "فارس", city: "شیراز" }).city).toBe(
      "در حال حاضر فقط به شهر تهران ارسال داریم.",
    );
    expect(errors({ city: "" }).city).toBe("شهر را انتخاب کنید");
  });

  it("موبایل و نشانی نامعتبر", () => {
    expect(
      errors({ receiverPhone: "02112345678" }).receiverPhone,
    ).toBeDefined();
    expect(errors({ line: "کوتاه" }).line).toBeDefined();
  });
});
