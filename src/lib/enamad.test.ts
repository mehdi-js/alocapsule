import { describe, expect, it } from "vitest";

import { enamadSnippet, enamadUrls, parseEnamadCode } from "./enamad";

const SNIPPET =
  "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=612345&Code=AbCdEf123456'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=612345&Code=AbCdEf123456' alt='' style='cursor:pointer' code='AbCdEf123456'></a>";

describe("اینماد", () => {
  it("از کد کامل، آدرس یا &amp; شناسه و کد استخراج می‌شود", () => {
    const seal = { id: "612345", code: "AbCdEf123456" };
    expect(parseEnamadCode(SNIPPET)).toEqual(seal);
    expect(
      parseEnamadCode(
        "https://trustseal.enamad.ir/?id=612345&amp;Code=AbCdEf123456",
      ),
    ).toEqual(seal);
    expect(parseEnamadCode(enamadSnippet(seal))).toEqual(seal);
  });

  it("کد ناقص یا دامنه‌ی دیگر ⇒ null", () => {
    expect(parseEnamadCode("")).toBeNull();
    expect(parseEnamadCode("https://evil.example/?id=1&Code=abcd")).toBeNull();
    expect(
      parseEnamadCode("https://trustseal.enamad.ir/?id=612345"),
    ).toBeNull();
    expect(
      parseEnamadCode(
        "https://trustseal.enamad.ir/?id=1&Code=a'><script>alert(1)</script>",
      ),
    ).toBeNull();
  });

  it("آدرس‌ها فقط از دامنه‌ی رسمی ساخته می‌شوند", () => {
    expect(enamadUrls({ id: "7", code: "Abcd1234" })).toEqual({
      page: "https://trustseal.enamad.ir/?id=7&Code=Abcd1234",
      logo: "https://trustseal.enamad.ir/logo.aspx?id=7&Code=Abcd1234",
    });
  });
});
