import { describe, expect, it } from "vitest";

import { defaultImageAlt } from "./image-alt";

describe("defaultImageAlt", () => {
  it("تصویر اول: نام محصول + برند", () => {
    expect(defaultImageAlt("باقلوا گردویی", "علی حان", 0)).toBe(
      "باقلوا گردویی علی حان",
    );
  });

  it("تصاویر بعدی شماره می‌گیرند (از ۲)", () => {
    expect(defaultImageAlt("باقلوا گردویی", "علی حان", 1)).toBe(
      "باقلوا گردویی علی حان ۲",
    );
    expect(defaultImageAlt(" سوتلاوا ", "علی حان", 4)).toBe(
      "سوتلاوا علی حان ۵",
    );
  });
});
