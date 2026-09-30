import { describe, expect, it } from "vitest";

import { cardDigits, formatCardNumber } from "@/lib/payment";

describe("کارت بانکی", () => {
  it("قالب نمایش و ارقام کپی", () => {
    expect(formatCardNumber("6037991200000000")).toBe("6037 9912 0000 0000");
    expect(formatCardNumber("۶۰۳۷-۹۹۱۲-۰۰۰۰-۰۰۰۰")).toBe("6037 9912 0000 0000");
    expect(cardDigits("6037 9912 0000 0000")).toBe("6037991200000000");
  });
});
