import { describe, expect, it } from "vitest";

import { placeOrderSchema } from "@/lib/validation/checkout";

const base = {
  shippingMethodId: "m1",
  customerNote: "",
  expectedGrandTotal: 1000,
};

describe("placeOrderSchema", () => {
  it("تحویل حضوری: بدون addressId معتبر است و پذیرش پیش‌فرض false", () => {
    const parsed = placeOrderSchema.parse(base);
    expect(parsed.addressId).toBeNull();
    expect(parsed.acceptServiceTerms).toBe(false);
  });

  it("addressId خالی/null ⇒ null؛ مقدار دیگر حفظ می‌شود", () => {
    expect(placeOrderSchema.parse({ ...base, addressId: "" }).addressId).toBe(
      null,
    );
    expect(placeOrderSchema.parse({ ...base, addressId: null }).addressId).toBe(
      null,
    );
    expect(placeOrderSchema.parse({ ...base, addressId: "a1" }).addressId).toBe(
      "a1",
    );
  });

  it("پذیرش شرایط بولی است", () => {
    expect(
      placeOrderSchema.parse({ ...base, acceptServiceTerms: true })
        .acceptServiceTerms,
    ).toBe(true);
    expect(
      placeOrderSchema.safeParse({ ...base, acceptServiceTerms: "yes" })
        .success,
    ).toBe(false);
  });

  it("روش ارسال هنوز الزامی است", () => {
    expect(
      placeOrderSchema.safeParse({ ...base, shippingMethodId: "" }).success,
    ).toBe(false);
  });
});
