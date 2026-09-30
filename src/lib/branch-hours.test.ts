import { describe, expect, it } from "vitest";

import {
  formatOpeningHours,
  openingHoursSpecification,
  parseOpeningHours,
} from "./branch-hours";

describe("ساعات کاری شعبه", () => {
  it("parse: روز/ساعت نامعتبر حذف و مرتب‌سازی شنبه‌محور", () => {
    const hours = parseOpeningHours({
      days: [
        { day: "friday", open: "16:00", close: "23:00" },
        { day: "saturday", open: "10:00", close: "23:00" },
        { day: "sunday", open: "25:00", close: "23:00" },
        { day: "x", open: "10:00", close: "11:00" },
      ],
      note: " تعطیلات رسمی بسته ",
    });
    expect(hours.days.map((d) => d.day)).toEqual(["saturday", "friday"]);
    expect(hours.note).toBe("تعطیلات رسمی بسته");
    expect(parseOpeningHours(null)).toEqual({ days: [], note: "" });
  });

  it("format: گروه روزهای پشت‌سرهم با ساعت یکسان", () => {
    const week = ["saturday", "sunday", "monday", "tuesday", "wednesday"].map(
      (day) => ({ day, open: "10:00", close: "23:00" }),
    );
    const hours = parseOpeningHours({
      days: [...week, { day: "friday", open: "16:00", close: "23:00" }],
      note: "",
    });
    expect(formatOpeningHours(hours)).toEqual([
      "شنبه تا چهارشنبه: ۱۰:۰۰ تا ۲۳:۰۰",
      "جمعه: ۱۶:۰۰ تا ۲۳:۰۰",
    ]);
  });

  it("format: همه روزه و فقط note (داده‌ی منتقل‌شده)", () => {
    const all = parseOpeningHours({
      days: [
        "saturday",
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ].map((day) => ({ day, open: "09:00", close: "22:00" })),
    });
    expect(formatOpeningHours(all)).toEqual(["همه روزه: ۰۹:۰۰ تا ۲۲:۰۰"]);
    expect(formatOpeningHours({ days: [], note: "همه روزه ۹ تا ۲۲" })).toEqual([
      "همه روزه ۹ تا ۲۲",
    ]);
  });

  it("schema: OpeningHoursSpecification لاتین", () => {
    expect(
      openingHoursSpecification(
        parseOpeningHours({
          days: [{ day: "monday", open: "10:00", close: "22:30" }],
        }),
      ),
    ).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "10:00",
        closes: "22:30",
      },
    ]);
  });
});
