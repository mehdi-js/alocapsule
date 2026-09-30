import { describe, expect, it } from "vitest";

import {
  autoMetaDescription,
  buildDocumentTitle,
  effectiveMeta,
  effectiveTitle,
} from "./title";

const settings = { brandName: "علی حان", titleTemplate: "%s | {brandName}" };

describe("عنوان صفحه", () => {
  it("قالب برند اعمال می‌شود", () => {
    expect(buildDocumentTitle("خرید باقلوا گردویی", settings)).toBe(
      "خرید باقلوا گردویی | علی حان",
    );
  });

  it("قالب بدون %s ⇒ همان عنوان", () => {
    expect(
      buildDocumentTitle("x", { brandName: "b", titleTemplate: "بدون جا" }),
    ).toBe("x");
  });

  it("seoTitle خالی ⇒ نام", () => {
    expect(effectiveTitle("", "سوتلاوا")).toBe("سوتلاوا");
    expect(effectiveTitle(null, "سوتلاوا")).toBe("سوتلاوا");
    expect(effectiveTitle(" خرید سوتلاوا ", "سوتلاوا")).toBe("خرید سوتلاوا");
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
