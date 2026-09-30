import { describe, expect, it } from "vitest";

import {
  ensureUniqueSlug,
  MAX_SLUG_LENGTH,
  SLUG_PATTERN,
  slugify,
} from "@/lib/slug";

describe("slugify (نامک لاتین)", () => {
  it.each([
    ["Charge Butane", "charge-butane"],
    ["  Oxygen -- Nitrogen!! ", "oxygen-nitrogen"],
    ["box 12", "box-12"],
    ["پک ۱۲ عددی", "12"],
    ["شارژ بوتان", ""],
    ["---", ""],
    ["", ""],
  ])("%j ⇒ %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("حداکثر ۶۰ کاراکتر، بریده روی مرز خط تیره", () => {
    const slug = slugify(`${"word ".repeat(20)}end`);
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug).toMatch(SLUG_PATTERN);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("الگو: فارسی، فاصله، حروف بزرگ و خط تیره‌ی اضافه مجاز نیست", () => {
    expect(SLUG_PATTERN.test("charge-butane")).toBe(true);
    expect(SLUG_PATTERN.test("کپسول")).toBe(false);
    expect(SLUG_PATTERN.test("Capsule")).toBe(false);
    expect(SLUG_PATTERN.test("bad slug")).toBe(false);
    expect(SLUG_PATTERN.test("-bad")).toBe(false);
    expect(SLUG_PATTERN.test("a--b")).toBe(false);
  });
});

describe("ensureUniqueSlug", () => {
  it("اگر آزاد بود همان را برمی‌گرداند", async () => {
    expect(await ensureUniqueSlug("sutlava", async () => false)).toBe(
      "sutlava",
    );
  });

  it("پسوند عددی می‌گذارد", async () => {
    const taken = new Set(["sutlava", "sutlava-2"]);
    expect(await ensureUniqueSlug("sutlava", async (s) => taken.has(s))).toBe(
      "sutlava-3",
    );
  });
});
