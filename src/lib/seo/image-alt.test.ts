import { describe, expect, it } from "vitest";

import { defaultImageAlt } from "./image-alt";

describe("defaultImageAlt", () => {
  it("تصویر اول: نام محصول + برند", () => {
    expect(defaultImageAlt("شارژ بوتان", "الو کپسول", 0)).toBe(
      "شارژ بوتان الو کپسول",
    );
  });

  it("تصاویر بعدی شماره می‌گیرند (از ۲)", () => {
    expect(defaultImageAlt("شارژ بوتان", "الو کپسول", 1)).toBe(
      "شارژ بوتان الو کپسول ۲",
    );
    expect(defaultImageAlt(" بوتان ", "الو کپسول", 4)).toBe(
      "بوتان الو کپسول ۵",
    );
  });
});
