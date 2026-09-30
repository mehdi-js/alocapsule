import { beforeAll, describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./secret-box";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234";
});

describe("رمزنگاری مقادیر محرمانه‌ی تنظیمات", () => {
  it("رمز و بازگشایی؛ هر بار خروجی متفاوت و بدون متن خام", () => {
    const a = encryptSecret("api-key-۱۲۳");
    const b = encryptSecret("api-key-۱۲۳");
    expect(a).not.toBe(b);
    expect(a).not.toContain("api-key");
    expect(decryptSecret(a)).toBe("api-key-۱۲۳");
  });

  it("دستکاری یا AUTH_SECRET دیگر ⇒ null", () => {
    const sealed = encryptSecret("secret");
    expect(decryptSecret(sealed.slice(0, -2) + "AA")).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
    process.env.AUTH_SECRET = "another-secret-another-secret-123456";
    expect(decryptSecret(sealed)).toBeNull();
  });
});
