import { describe, expect, it } from "vitest";

import {
  autoMetaDescription,
  buildDocumentTitle,
  effectiveMeta,
  effectiveTitle,
} from "./title";

const settings = { brandName: "الو کپسول", titleTemplate: "%s | {brandName}" };

describe("عنوان صفحه", () => {
  it("قالب برند اعمال می‌شود", () => {
    expect(buildDocumentTitle("خرید شارژ بوتان", settings)).toBe(
      "خرید شارژ بوتان | الو کپسول",
    );
  });

  it("قالب بدون %s ⇒ همان عنوان", () => {
    expect(
      buildDocumentTitle("x", { brandName: "b", titleTemplate: "بدون جا" }),
    ).toBe("x");
  });

  it("seoTitle خالی ⇒ نام", () => {
    expect(effectiveTitle("", "بوتان")).toBe("بوتان");
    expect(effectiveTitle(null, "بوتان")).toBe("بوتان");
    expect(effectiveTitle(" خرید بوتان ", "بوتان")).toBe("خرید بوتان");
  });
});

describe("متای خودکار", () => {
  it("از متن بدون قالب‌بندی و حداکثر ۱۵۵ کاراکتر", () => {
    const text = `## عنوان\n${"کلمه ".repeat(60)}[لینک](/a)`;
    const meta = autoMetaDescription(text);
    expect(meta.length).toBeLessThanOrEqual(155);
    expect(meta.startsWith("عنوان کلمه")).toBe(true);
    expect(meta).not.toContain("##");
    expect(meta.endsWith("…")).toBe(true);
  });

  it("متای دستی اولویت دارد", () => {
    expect(effectiveMeta("دستی", "متن")).toBe("دستی");
    expect(effectiveMeta("  ", "متن کوتاه")).toBe("متن کوتاه");
  });
});
