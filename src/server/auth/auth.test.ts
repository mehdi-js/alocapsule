import { beforeAll, describe, expect, it } from "vitest";

import { signSessionJwt, verifySessionJwt } from "./jwt";
import {
  generateOtpCode,
  hashOtp,
  hashSessionToken,
  verifyOtpHash,
} from "./otp-crypto";
import { getClientIp } from "./request";

const SECRET = "test-secret-test-secret-test-secret-1234";

beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
});

describe("OTP crypto", () => {
  it("کد همیشه ۶ رقم لاتین است", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("hash قطعی و وابسته به شماره است و کد خام را نشان نمی‌دهد", () => {
    const a = hashOtp("09123456789", "123456");
    expect(a).toBe(hashOtp("09123456789", "123456"));
    expect(a).not.toBe(hashOtp("09123456780", "123456"));
    expect(a).not.toContain("123456");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyOtpHash فقط کد درست را می‌پذیرد", () => {
    const hash = hashOtp("09123456789", "123456");
    expect(verifyOtpHash("09123456789", "123456", hash)).toBe(true);
    expect(verifyOtpHash("09123456789", "123457", hash)).toBe(false);
    expect(verifyOtpHash("09123456789", "123456", "abcd")).toBe(false);
  });

  it("hash توکن نشست SHA-256 است", () => {
    expect(hashSessionToken("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("AUTH_SECRET کوتاه خطا می‌دهد", () => {
    process.env.AUTH_SECRET = "short";
    expect(() => hashOtp("09123456789", "123456")).toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = SECRET;
  });
});

describe("session JWT", () => {
  const claims = {
    sessionId: "sid-1",
    userId: "user-1",
    role: "ADMIN",
  } as const;
  const future = () => new Date(Date.now() + 60_000);

  it("رفت‌وبرگشت claims", async () => {
    const token = await signSessionJwt(claims, future());
    expect(await verifySessionJwt(token)).toEqual(claims);
  });

  it("توکن دستکاری‌شده یا با secret دیگر رد می‌شود", async () => {
    const token = await signSessionJwt(claims, future());
    const [header, payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: "user-1", jti: "sid-1", role: "ADMIN", extra: 1 }),
    ).toString("base64url");
    expect(
      await verifySessionJwt(`${header}.${tamperedPayload}.${signature}`),
    ).toBeNull();
    expect(payload).toBeTruthy();

    process.env.AUTH_SECRET = "another-secret-another-secret-123456";
    expect(await verifySessionJwt(token)).toBeNull();
    process.env.AUTH_SECRET = SECRET;
  });

  it("توکن منقضی، خالی و بی‌معنی رد می‌شود", async () => {
    const expired = await signSessionJwt(claims, new Date(Date.now() - 1000));
    expect(await verifySessionJwt(expired)).toBeNull();
    expect(await verifySessionJwt("")).toBeNull();
    expect(await verifySessionJwt("not.a.jwt")).toBeNull();
  });

  it("الگوریتم none پذیرفته نمی‌شود", async () => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const forged = `${encode({ alg: "none", typ: "JWT" })}.${encode({
      sub: "user-1",
      jti: "sid-1",
      role: "ADMIN",
      exp: Math.floor(Date.now() / 1000) + 60,
    })}.`;
    expect(await verifySessionJwt(forged)).toBeNull();
  });
});

describe("getClientIp", () => {
  it("اولین مقدار x-forwarded-for، سپس x-real-ip", () => {
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
    ).toBe("1.1.1.1");
    expect(getClientIp(new Headers({ "x-real-ip": "3.3.3.3" }))).toBe(
      "3.3.3.3",
    );
    expect(getClientIp(new Headers())).toBeNull();
  });
});
