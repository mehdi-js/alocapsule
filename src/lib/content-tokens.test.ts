import { describe, expect, it } from "vitest";

import { applyContentTokens, applyTokensToFaq } from "./content-tokens";

describe("applyContentTokens", () => {
  it("توکن‌ها با مقدار تنظیمات جایگزین می‌شوند", () => {
    expect(
      applyContentTokens(
        "ارسال عادی (تحویل [[normal.estimate]]) و رایگان از [[free.quantity]] عدد؛ حضوری [[pickup.hours]]",
        {
          "normal.estimate": "۱ روزه",
          "free.quantity": "۱۰۰",
          "pickup.hours": "۹ صبح تا ۶ عصر",
        },
      ),
    ).toBe(
      "ارسال عادی (تحویل ۱ روزه) و رایگان از ۱۰۰ عدد؛ حضوری ۹ صبح تا ۶ عصر",
    );
  });

  it("مقدار خالی/نبود ⇒ علامت تکمیل برای seo:audit؛ توکن ناشناخته دست‌نخورده", () => {
    const text = applyContentTokens("زمان [[express.estimate]] و [[nope.x]]", {
      "express.estimate": "  ",
    });
    expect(text).toContain("{{تکمیل توسط الو کپسول: زمان تحویل ارسال فوری}}");
    expect(text).toContain("[[nope.x]]");
  });

  it("روی سوال و پاسخ FAQ اعمال می‌شود", () => {
    expect(
      applyTokensToFaq(
        [{ question: "چه زمانی؟", answer: "[[express.estimate]]" }],
        {
          "express.estimate": "۱ تا ۴ ساعت",
        },
      ),
    ).toEqual([{ question: "چه زمانی؟", answer: "۱ تا ۴ ساعت" }]);
  });
});
