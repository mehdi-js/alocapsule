import { describe, expect, it } from "vitest";

import { findDuplicateKeywords } from "./keywords";

describe("findDuplicateKeywords", () => {
  it("املای متفاوت یک عبارت تکراری حساب می‌شود", () => {
    expect(
      findDuplicateKeywords([
        { label: "الف", focusKeyword: "شارژ کپسول‌گاز" },
        { label: "ب", focusKeyword: "شارژ کپسول گاز" },
        { label: "ج", focusKeyword: "خرید کپسول گاز" },
        { label: "د", focusKeyword: null },
        { label: "ه", focusKeyword: "" },
      ]),
    ).toEqual([{ keyword: "شارژ کپسول گاز", labels: ["الف", "ب"] }]);
  });
});
