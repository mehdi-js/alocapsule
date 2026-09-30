import { describe, expect, it } from "vitest";

import { expandCategoryIds } from "./coupon.service";

describe("expandCategoryIds", () => {
  const tree = [
    { id: "root", parentId: null },
    { id: "child", parentId: "root" },
    { id: "grandchild", parentId: "child" },
    { id: "other", parentId: null },
  ];

  it("زیردسته‌ها در هر عمقی اضافه می‌شوند", () => {
    expect(expandCategoryIds(["root"], tree).sort()).toEqual(
      ["child", "grandchild", "root"].sort(),
    );
  });

  it("دسته‌ی بدون زیردسته فقط خودش", () => {
    expect(expandCategoryIds(["other"], tree)).toEqual(["other"]);
    expect(expandCategoryIds([], tree)).toEqual([]);
  });
});
