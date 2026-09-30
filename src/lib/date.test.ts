import { describe, expect, it } from "vitest";

import {
  endOfTehranDay,
  formatJalali,
  formatJalaliDateTime,
  formatJalaliLong,
  jalaliToDate,
  parseJalaliDateInput,
  toJalaliDateInput,
  toJalaliParts,
} from "@/lib/date";

describe("formatJalali", () => {
  it("نوروز ۱۴۰۴ (۲۱ مارس ۲۰۲۵)", () => {
    const date = new Date("2025-03-21T12:00:00Z");
    expect(formatJalali(date)).toBe("۱۴۰۴/۰۱/۰۱");
    expect(formatJalali(date, "YYYY/MM/DD", { digits: "en" })).toBe(
      "1404/01/01",
    );
  });

  it("مرز روز به وقت تهران (UTC+3:30) را رعایت می‌کند", () => {
    // ۲۰:۲۹ UTC = ۲۳:۵۹ تهران، هنوز ۳۰ اسفند ۱۴۰۳
    expect(formatJalali("2025-03-20T20:29:00Z")).toBe("۱۴۰۳/۱۲/۳۰");
    // ۲۰:۳۰ UTC = ۰۰:۰۰ تهران، ۱ فروردین ۱۴۰۴
    expect(formatJalali("2025-03-20T20:30:00Z")).toBe("۱۴۰۴/۰۱/۰۱");
  });

  it("مرز سال کبیسه: ۳۰ اسفند ۱۴۰۳ وجود دارد", () => {
    expect(formatJalali("2025-03-20T10:00:00Z")).toBe("۱۴۰۳/۱۲/۳۰");
  });

  it("تاریخ و ساعت و قالب بلند", () => {
    const date = new Date("2025-03-20T21:00:00Z");
    expect(formatJalaliDateTime(date)).toBe("۱۴۰۴/۰۱/۰۱ ۰۰:۳۰");
    expect(formatJalaliLong(date)).toBe("۱ فروردین ۱۴۰۴");
  });

  it("ورودی نامعتبر خطا می‌دهد", () => {
    expect(() => formatJalali("not-a-date")).toThrow(RangeError);
  });
});

describe("toJalaliParts", () => {
  it("اجزای تاریخ شمسی را برمی‌گرداند", () => {
    expect(toJalaliParts("2025-09-22T20:30:00Z")).toEqual({
      year: 1404,
      month: 7,
      day: 1,
    });
  });
});

describe("jalaliToDate", () => {
  it("۱ فروردین ۱۴۰۴ ساعت ۰۰:۰۰ تهران = ۲۰:۳۰ UTC روز قبل", () => {
    expect(jalaliToDate(1404, 1, 1).toISOString()).toBe(
      "2025-03-20T20:30:00.000Z",
    );
  });

  it("ساعت و دقیقه را اعمال می‌کند", () => {
    expect(jalaliToDate(1404, 6, 31, 23, 59).toISOString()).toBe(
      "2025-09-22T20:29:00.000Z",
    );
  });

  it("رفت‌وبرگشت با formatJalali سازگار است", () => {
    const date = jalaliToDate(1403, 12, 30, 10, 15);
    expect(formatJalali(date, "YYYY/MM/DD HH:mm", { digits: "en" })).toBe(
      "1403/12/30 10:15",
    );
  });

  it("تاریخ نامعتبر خطا می‌دهد", () => {
    expect(() => jalaliToDate(1404, 12, 30)).toThrow(RangeError); // سال غیرکبیسه
    expect(() => jalaliToDate(1404, 13, 1)).toThrow(RangeError);
    expect(() => jalaliToDate(1404, 7, 31)).toThrow(RangeError); // مهر ۳۰ روز
    expect(() => jalaliToDate(1404, 1, 1, 24, 0)).toThrow(RangeError);
  });
});

describe("ورودی تاریخ شمسی فرم", () => {
  it("ارقام فارسی و لاتین، با / یا -", () => {
    const expected = "2025-09-22T20:30:00.000Z"; // ۱ مهر ۱۴۰۴ ساعت ۰۰:۰۰ تهران
    expect(parseJalaliDateInput("۱۴۰۴/۰۷/۰۱")?.toISOString()).toBe(expected);
    expect(parseJalaliDateInput("1404-7-1")?.toISOString()).toBe(expected);
    expect(parseJalaliDateInput(" ۱۴۰۴/۷/۱ ")?.toISOString()).toBe(expected);
  });

  it("خالی ⇒ null و نامعتبر ⇒ خطا", () => {
    expect(parseJalaliDateInput("")).toBeNull();
    expect(parseJalaliDateInput("   ")).toBeNull();
    for (const bad of [
      "1404/13/01",
      "1404/12/30",
      "۱۴۰۴",
      "abc",
      "01/07/1404",
    ]) {
      expect(() => parseJalaliDateInput(bad)).toThrow(RangeError);
    }
  });

  it("پایان روز شامل کل همان روز تهران است", () => {
    const start = parseJalaliDateInput("1404/07/01")!;
    const end = endOfTehranDay(start);
    expect(end.toISOString()).toBe("2025-09-23T20:29:59.999Z");
    expect(toJalaliDateInput(end)).toBe("1404/07/01");
    expect(toJalaliDateInput(start)).toBe("1404/07/01");
    expect(toJalaliDateInput(null)).toBe("");
  });
});
