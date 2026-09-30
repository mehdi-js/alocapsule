import { describe, expect, it } from "vitest";

import { countWords, normalizeFa, stripHtml, truncateAtWord } from "./text";

describe("normalizeFa", () => {
  it("نیم‌فاصله و فاصله برابرند (معیار S0)", () => {
    expect(normalizeFa("شارژ اکسیژن")).toBe(normalizeFa("شارژ اکسیژن"));
  });

  it("ي و ك عربی، اعراب، کشیده و ارقام", () => {
    expect(normalizeFa("كپسول پنيري")).toBe("کپسول پنیری");
    expect(normalizeFa("كـــپسول")).toBe("کپسول");
    expect(normalizeFa("شِارژ")).toBe("شارژ");
    expect(normalizeFa("پک ۱۲ عددی")).toBe("پک 12 عددی");
    expect(normalizeFa("پک ١٢")).toBe("پک 12");
  });

  it("حروف لاتین کوچک و فاصله‌ی اضافه حذف", () => {
    expect(normalizeFa("  AloCapsule   CAPSULE ")).toBe("alocapsule capsule");
    expect(normalizeFa("ALOCAPSULE")).toBe(normalizeFa("AloCapsule"));
  });
});

describe("stripHtml", () => {
  it("تگ‌ها، اسکریپت و entityها", () => {
    expect(
      stripHtml(
        "<h2>عنوان</h2><p>متن &amp; <strong>پررنگ</strong></p><script>x()</script>",
      ),
    ).toBe("عنوان متن & پررنگ");
    expect(stripHtml("پسته&zwnj;ای&nbsp;تازه")).toBe("پسته‌ای تازه");
    expect(stripHtml("a&#39;b &#x41;")).toBe("a'b A");
  });

  it("بلوک‌ها با فاصله از هم جدا می‌شوند", () => {
    expect(stripHtml("<li>یک</li><li>دو</li>")).toBe("یک دو");
  });
});

describe("truncateAtWord", () => {
  it("متن کوتاه دست نمی‌خورد", () => {
    expect(truncateAtWord("شارژ بوتان", 50)).toBe("شارژ بوتان");
  });

  it("کلمه را نمی‌شکند و از سقف بیشتر نمی‌شود", () => {
    const text = "شارژ بوتان الو کپسول با مغز گردوی تازه";
    const cut = truncateAtWord(text, 20);
    expect(cut.length).toBeLessThanOrEqual(20);
    expect(cut).toBe("شارژ بوتان الو…");
  });

  it("علامت انتهایی قبل از «…» حذف می‌شود", () => {
    expect(truncateAtWord("اول، دوم سوم", 9)).toBe("اول…");
  });
});

describe("countWords", () => {
  it("نیم‌فاصله یک کلمه، HTML و علائم شمرده نمی‌شوند", () => {
    expect(countWords("شارژ اکسیژن")).toBe(2);
    expect(countWords("<p>یک دو</p> — <b>سه</b>")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});
