import { describe, expect, it } from "vitest";

import {
  DEFAULT_RELATED_RULES,
  orderRelated,
  parseRelatedRules,
} from "./related-rules";

describe("parseRelatedRules", () => {
  it("مرجع‌های معتبر پارس و نامعتبر نادیده گرفته می‌شود", () => {
    expect(
      parseRelatedRules({
        "buy-gas-capsule": [
          "product:picnic-gas",
          "category:x-y",
          "bad",
          5,
          "product:Bad Slug",
        ],
        broken: "nope",
      }),
    ).toEqual({
      "buy-gas-capsule": [
        { kind: "product", slug: "picnic-gas" },
        { kind: "category", slug: "x-y" },
      ],
    });
    expect(parseRelatedRules(null)).toEqual({});
    expect(parseRelatedRules([])).toEqual({});
  });

  it("قواعد پیش‌فرض seed معتبرند", () => {
    const parsed = parseRelatedRules(DEFAULT_RELATED_RULES);
    expect(Object.keys(parsed)).toEqual(Object.keys(DEFAULT_RELATED_RULES));
    for (const refs of Object.values(parsed))
      expect(refs.length).toBeGreaterThan(0);
  });
});

describe("orderRelated", () => {
  const p = (id: string) => ({ id });

  it("متناظر اول، بعد قاعده، بعد هم‌دسته؛ بدون تکرار و بدون خود محصول", () => {
    const result = orderRelated(
      "self",
      [
        [p("paired")],
        [p("picnic"), p("paired")],
        [p("self"), p("s1"), p("picnic"), p("s2"), p("s3")],
      ],
      4,
    );
    expect(result.map((r) => r.id)).toEqual(["paired", "picnic", "s1", "s2"]);
  });

  it("گروه خالی و سقف", () => {
    expect(orderRelated("a", [[], [p("b")]], 4).map((r) => r.id)).toEqual([
      "b",
    ]);
    expect(orderRelated("a", [[p("b"), p("c"), p("d")]], 2)).toHaveLength(2);
  });
});
