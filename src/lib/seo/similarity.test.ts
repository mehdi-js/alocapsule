import { describe, expect, it } from "vitest";

import { similarityLevel, similarityWords, textSimilarity } from "./similarity";

const base =
  "شارژ کپسول گاز ۱۱ کیلویی برای مصرف خانگی مناسب است و کپسول خالی شما با کپسول پرشده تعویض می‌شود";

describe("textSimilarity", () => {
  it("متن یکسان ⇒ ۱؛ متن بی‌ارتباط ⇒ ۰", () => {
    expect(textSimilarity(base, base)).toBe(1);
    expect(
      textSimilarity(
        base,
        "پیک‌نیک سبک برای سفر و کمپینگ با ابعاد کوچک و قابل حمل",
      ),
    ).toBe(0);
  });

  it("فقط عدد اندازه فرق کند ⇒ هنوز ۱ (ارقام حذف می‌شوند)", () => {
    expect(textSimilarity(base, base.replaceAll("۱۱", "۲۵"))).toBe(1);
    expect(textSimilarity(base, base.replaceAll("11", "25"))).toBe(1);
  });

  it("تغییر جمله‌بندی شباهت را کم می‌کند و نیم‌فاصله/اعراب بی‌اثرند", () => {
    const rewritten =
      "برای مصارف خانگی، کپسول ۲۵ کیلویی انتخابی مناسب است؛ کپسول خالی‌تان تعویض می‌شود";
    const score = textSimilarity(base, rewritten);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.4);
    expect(
      textSimilarity("كپسول  گاز مايع خانگي", "کپسول گاز مایع خانگی"),
    ).toBe(1);
  });

  it("خالی ⇒ ۰ و rich text به متن ساده تبدیل می‌شود", () => {
    expect(textSimilarity("", base)).toBe(0);
    expect(textSimilarity(null, null)).toBe(0);
    expect(similarityWords("## عنوان\n\n**متن** [لینک](/x)")).toEqual([
      "عنوان",
      "متن",
      "لینک",
    ]);
  });
});

describe("similarityLevel", () => {
  it("آستانه‌ها: بالای ۶۰٪ قرمز، ۴۰ تا ۶۰ نارنجی", () => {
    expect(similarityLevel(0.61)).toBe("bad");
    expect(similarityLevel(0.6)).toBe("warn");
    expect(similarityLevel(0.4)).toBe("warn");
    expect(similarityLevel(0.39)).toBe("good");
  });
});
