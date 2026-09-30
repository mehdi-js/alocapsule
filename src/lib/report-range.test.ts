import { describe, expect, it } from "vitest";

import { formatJalali } from "@/lib/date";
import { calendarPeriods, rangeDays, resolveRange } from "@/lib/report-range";

const j = (date: Date) =>
  formatJalali(date, "YYYY/MM/DD HH:mm", { digits: "en" });

describe("بازه‌های گزارش", () => {
  // ۲ مهر ۱۴۰۵ (پنجشنبه) ساعت ۱۰ صبح تهران
  const now = new Date("2026-09-24T06:30:00Z");

  it("امروز/۷ روز/۳۰ روز به وقت تهران، نیم‌باز", () => {
    const today = resolveRange({ preset: "today" }, now);
    expect(today.ok && [j(today.range.from), j(today.range.to)]).toEqual([
      "1405/07/02 00:00",
      "1405/07/03 00:00",
    ]);
    const week = resolveRange({ preset: "7d" }, now);
    expect(week.ok && j(week.range.from)).toBe("1405/06/27 00:00");
    expect(week.ok && week.range.days).toBe(7);
    const month = resolveRange({ preset: "30d" }, now);
    expect(month.ok && month.range.days).toBe(30);
  });

  it("بازه‌ی دلخواه: مرز ماه و سال", () => {
    // ۳۰ اسفند ۱۴۰۳ (کبیسه) تا ۱ فروردین ۱۴۰۴
    const result = resolveRange(
      { preset: "custom", from: "1403/12/30", to: "۱۴۰۴/۰۱/۰۱" },
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.from.toISOString()).toBe("2025-03-19T20:30:00.000Z");
    expect(result.range.to.toISOString()).toBe("2025-03-21T20:30:00.000Z");
    expect(result.range.days).toBe(2);
    expect(rangeDays(result.range).map((d) => formatJalali(d))).toEqual([
      "۱۴۰۳/۱۲/۳۰",
      "۱۴۰۴/۰۱/۰۱",
    ]);

    // مرز ماه ۳۱ روزه و ۳۰ روزه: ۳۱ شهریور تا ۱ مهر
    const monthEdge = resolveRange(
      { preset: "custom", from: "1405/06/31", to: "1405/07/01" },
      now,
    );
    expect(monthEdge.ok && monthEdge.range.days).toBe(2);
  });

  it("ورودی نامعتبر", () => {
    expect(
      resolveRange(
        { preset: "custom", from: "1405/07/10", to: "1405/07/01" },
        now,
      ),
    ).toMatchObject({ ok: false });
    expect(
      resolveRange(
        { preset: "custom", from: "1404/12/30", to: "1405/01/01" },
        now,
      ),
    ).toMatchObject({ ok: false });
    expect(
      resolveRange(
        { preset: "custom", from: "1403/01/01", to: "1405/01/01" },
        now,
      ),
    ).toMatchObject({ ok: false, message: expect.stringContaining("حداکثر") });
    expect(resolveRange({ preset: "yearly" }, now)).toMatchObject({
      ok: false,
    });
  });

  it("کارت‌های تقویمی: هفته از شنبه، ماه از اول ماه شمسی", () => {
    const periods = calendarPeriods(now);
    expect(j(periods.today.from)).toBe("1405/07/02 00:00");
    // پنجشنبه ۲ مهر ⇒ شنبه ۲۸ شهریور
    expect(j(periods.week.from)).toBe("1405/06/28 00:00");
    expect(j(periods.month.from)).toBe("1405/07/01 00:00");
    expect(j(periods.month.to)).toBe("1405/07/03 00:00");

    // اول سال: ماه از ۱ فروردین
    const nowruz = calendarPeriods(new Date("2026-03-21T08:00:00Z"));
    expect(j(nowruz.month.from)).toBe("1405/01/01 00:00");
    // شنبه خودش شروع هفته است
    const saturday = calendarPeriods(new Date("2026-09-19T08:00:00Z"));
    expect(j(saturday.week.from)).toBe(j(saturday.today.from));
  });
});
