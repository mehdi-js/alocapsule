import { describe, expect, it, vi } from "vitest";

import { createSmsProvider } from "./index";
import { MelipayamakProvider } from "./melipayamak-provider";
import { sanitizeSmsArg } from "./sanitize";

function xml(value: string) {
  return `<?xml version="1.0" encoding="utf-8"?><string xmlns="http://tempuri.org/">${value}</string>`;
}

function providerWith(fetchImpl: typeof fetch) {
  return new MelipayamakProvider({
    username: "user",
    password: "pass",
    fetchImpl,
  });
}

const params = { to: "09123456789", patternId: "1234", args: ["123456"] };

describe("sanitizeSmsArg", () => {
  it("; لاتین و فارسی و کاراکترهای کنترلی را حذف می‌کند", () => {
    expect(sanitizeSmsArg("a;b")).toBe("a b");
    expect(sanitizeSmsArg("علی؛حان")).toBe("علی حان");
    expect(sanitizeSmsArg("x\ny\tz")).toBe("x y z");
    expect(sanitizeSmsArg("  ;;  ")).toBe("");
  });

  it("عدد و رشته‌ی معمولی را دست‌نخورده می‌گذارد", () => {
    expect(sanitizeSmsArg(250000)).toBe("250000");
    expect(sanitizeSmsArg("AL-14040625-0031")).toBe("AL-14040625-0031");
  });

  it("ترتیب متغیرهای الگو با وجود ; داخل مقدار حفظ می‌شود", () => {
    const text = ["AL-1", "بامزه;تقلبی", "99"].map(sanitizeSmsArg).join(";");
    expect(text.split(";")).toEqual(["AL-1", "بامزه تقلبی", "99"]);
  });
});

describe("MelipayamakProvider", () => {
  it("درخواست را با فرم‌کدشده و متغیرهای جداشده با ; می‌فرستد", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(xml("123456789012345678")),
    );
    const provider = providerWith(fetchImpl as unknown as typeof fetch);

    const result = await provider.sendPattern({
      ...params,
      args: ["AL-1", "a;b"],
    });

    expect(result).toEqual({
      ok: true,
      providerMessageId: "123456789012345678",
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://api.payamak-panel.com/post/send.asmx/SendByBaseNumber2",
    );
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("username")).toBe("user");
    expect(body.get("text")).toBe("AL-1;a b");
    expect(body.get("to")).toBe("09123456789");
    expect(body.get("bodyId")).toBe("1234");
  });

  it.each([
    ["0", "نام کاربری"],
    ["2", "اعتبار"],
    ["-4", "bodyId"],
    ["-5", "متغیرهای الگو"],
    ["-110", "ApiKey"],
    ["19", "ساعتی"],
  ])("کد خطای %s را ناموفق تشخیص می‌دهد", async (code, fragment) => {
    const provider = providerWith(
      (async () => new Response(xml(code))) as typeof fetch,
    );
    const result = await provider.sendPattern(params);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(code);
      expect(result.errorMessage).toContain(fragment);
    }
  });

  it("کد ناشناخته را با پیام عمومی برمی‌گرداند", async () => {
    const provider = providerWith(
      (async () => new Response(xml("-999"))) as typeof fetch,
    );
    const result = await provider.sendPattern(params);
    expect(result).toMatchObject({ ok: false, errorCode: "-999" });
  });

  it("پاسخ غیر XML یا خالی را INVALID_RESPONSE می‌داند", async () => {
    for (const body of ["<html>oops</html>", "", xml("")]) {
      const provider = providerWith(
        (async () => new Response(body)) as typeof fetch,
      );
      expect(await provider.sendPattern(params)).toMatchObject({
        ok: false,
        errorCode: "INVALID_RESPONSE",
      });
    }
  });

  it("خطای HTTP را ناموفق می‌داند", async () => {
    const provider = providerWith(
      (async () => new Response("err", { status: 500 })) as typeof fetch,
    );
    expect(await provider.sendPattern(params)).toMatchObject({
      ok: false,
      errorCode: "HTTP_500",
    });
  });

  it("خطای شبکه و timeout هرگز throw نمی‌کنند", async () => {
    const network = providerWith((async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch);
    expect(await network.sendPattern(params)).toMatchObject({
      ok: false,
      errorCode: "NETWORK_ERROR",
    });

    const timeout = providerWith((async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as typeof fetch);
    expect(await timeout.sendPattern(params)).toMatchObject({
      ok: false,
      errorCode: "TIMEOUT",
    });
  });

  it("شناسه‌ی الگوی نامعتبر بدون ارسال درخواست رد می‌شود", async () => {
    const fetchImpl = vi.fn();
    const provider = providerWith(fetchImpl as unknown as typeof fetch);
    for (const patternId of ["", "abc"]) {
      expect(
        await provider.sendPattern({ ...params, patternId }),
      ).toMatchObject({
        ok: false,
        errorCode: "INVALID_PATTERN_ID",
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("createSmsProvider", () => {
  it("پیش‌فرض console است", () => {
    expect(createSmsProvider({}).name).toBe("console");
  });

  it("console در production خطا می‌دهد", () => {
    expect(() =>
      createSmsProvider({ SMS_PROVIDER: "console", NODE_ENV: "production" }),
    ).toThrow(/production/);
  });

  it("melipayamak بدون نام کاربری/رمز خطا می‌دهد", () => {
    expect(() => createSmsProvider({ SMS_PROVIDER: "melipayamak" })).toThrow(
      /MELIPAYAMAK_USERNAME/,
    );
    expect(
      createSmsProvider({
        SMS_PROVIDER: "melipayamak",
        MELIPAYAMAK_USERNAME: "u",
        MELIPAYAMAK_PASSWORD: "p",
      }).name,
    ).toBe("melipayamak");
  });

  it("مقدار ناشناخته خطا می‌دهد", () => {
    expect(() => createSmsProvider({ SMS_PROVIDER: "twilio" })).toThrow(
      /نامعتبر/,
    );
  });
});

describe("MelipayamakProvider.getCredit (بررسی اتصال)", () => {
  const credit = (body: string) =>
    new MelipayamakProvider({
      username: "u",
      password: "p",
      fetchImpl: (async () => new Response(body)) as typeof fetch,
    }).getCredit();

  it("عدد مثبت ⇒ اعتبار", async () => {
    expect(
      await credit('<double xmlns="http://tempuri.org/">1250.5</double>'),
    ).toEqual({ ok: true, credit: 1250.5 });
  });

  it("۰ ⇒ نام کاربری/رمز؛ کد منفی ⇒ پیام همان کد", async () => {
    const zero = await credit('<double xmlns="http://tempuri.org/">0</double>');
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.errorMessage).toContain("نام کاربری یا رمز");
    const apiKey = await credit(
      '<double xmlns="http://tempuri.org/">-110</double>',
    );
    if (!apiKey.ok) expect(apiKey.errorMessage).toContain("ApiKey");
    expect((await credit("<html>")).ok).toBe(false);
  });
});

describe("MelipayamakProvider.getDelivery (وضعیت تحویل)", () => {
  const delivery = (body: string) =>
    new MelipayamakProvider({
      username: "u",
      password: "p",
      fetchImpl: (async () => new Response(body)) as typeof fetch,
    }).getDelivery("123456789012345678");

  it("کد وضعیت ⇒ برچسب فارسی", async () => {
    expect(await delivery('<int xmlns="http://tempuri.org/">1</int>')).toEqual({
      ok: true,
      code: "1",
      label: "رسیده به گوشی",
    });
    expect(
      await delivery('<int xmlns="http://tempuri.org/">35</int>'),
    ).toMatchObject({ ok: true, label: "شماره در لیست سیاه" });
  });

  it("کد خطای اعتبارنامه یا پاسخ نامعتبر ⇒ خطا", async () => {
    const bad = await delivery('<int xmlns="http://tempuri.org/">-110</int>');
    expect(bad.ok).toBe(false);
    expect((await delivery("oops")).ok).toBe(false);
  });
});
