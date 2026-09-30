import { describe, expect, it } from "vitest";

import {
  classifyHref,
  parseInline,
  parseRichText,
  richTextLinks,
  richTextToPlain,
} from "./rich-text";

describe("parseRichText", () => {
  it("پاراگراف، شکست خط، سرتیتر و فهرست", () => {
    const blocks = parseRichText(
      "## عنوان\nخط یک\nخط دو\n\n- مورد الف\n- مورد ب\n\n### فرعی\nپایان",
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "heading",
      "paragraph",
    ]);
    expect(blocks[0]).toMatchObject({ level: 2 });
    expect(blocks[1]).toMatchObject({
      lines: [
        [{ type: "text", text: "خط یک" }],
        [{ type: "text", text: "خط دو" }],
      ],
    });
    expect(blocks[2]).toMatchObject({
      items: [[{ text: "مورد الف" }], [{ text: "مورد ب" }]],
    });
    expect(blocks[3]).toMatchObject({ level: 3 });
  });

  it("متن قدیمی (پاراگراف‌ها با خط خالی) همان پاراگراف‌ها می‌شود", () => {
    expect(parseRichText("اول\n\n\nدوم")).toHaveLength(2);
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText(null)).toEqual([]);
  });

  it("HTML متن است، نه تگ", () => {
    const [block] = parseRichText("<script>alert(1)</script>");
    expect(block).toEqual({
      type: "paragraph",
      lines: [[{ type: "text", text: "<script>alert(1)</script>" }]],
    });
  });
});

describe("parseInline", () => {
  it("لینک داخلی/خارجی و پررنگ", () => {
    expect(
      parseInline(
        "ببینید [باقلوا](/category/baklava) و **تازه** [سایت](https://example.com)",
      ),
    ).toEqual([
      { type: "text", text: "ببینید " },
      {
        type: "link",
        text: "باقلوا",
        href: "/category/baklava",
        internal: true,
      },
      { type: "text", text: " و " },
      { type: "strong", text: "تازه" },
      { type: "text", text: " " },
      {
        type: "link",
        text: "سایت",
        href: "https://example.com",
        internal: false,
      },
    ]);
  });

  it("آدرس خطرناک یا نامعتبر لینک نمی‌شود", () => {
    for (const href of [
      "javascript:alert(1)",
      "//evil.com",
      "data:x",
      "products",
    ]) {
      expect(parseInline(`[x](${href})`)).toEqual([
        { type: "text", text: `[x](${href})` },
      ]);
    }
  });
});

describe("classifyHref", () => {
  it("داخلی فقط با یک /", () => {
    expect(classifyHref("/products")).toEqual({
      href: "/products",
      internal: true,
    });
    expect(classifyHref("//x.com")).toBeNull();
  });
});

describe("richTextToPlain و richTextLinks", () => {
  const source = "## عنوان\nمتن [لینک](/a) **پررنگ**\n\n- [دو](https://b.com)";

  it("متن ساده بدون نشانه‌گذاری", () => {
    expect(richTextToPlain(source)).toBe("عنوان\n\nمتن لینک پررنگ\n\nدو");
  });

  it("فهرست لینک‌ها", () => {
    expect(richTextLinks(source)).toEqual([
      { href: "/a", internal: true },
      { href: "https://b.com", internal: false },
    ]);
  });
});
