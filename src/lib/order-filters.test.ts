import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "@/lib/csv";
import { orderFiltersQuery, parseOrderFilters } from "@/lib/order-filters";

describe("فیلتر سفارش‌ها", () => {
  it("وضعیت، بازه‌ی شمسی (پایان شامل کل روز) و جستجو", () => {
    const { filters, error } = parseOrderFilters({
      status: "PROCESSING",
      from: "۱۴۰۵/۰۷/۰۱",
      to: "1405/07/01",
      q: " ۰۹۱۲ ",
      page: "2",
    });
    expect(error).toBeNull();
    expect(filters.status).toBe("PROCESSING");
    expect(filters.from?.toISOString()).toBe("2026-09-22T20:30:00.000Z");
    expect(filters.to?.toISOString()).toBe("2026-09-23T20:30:00.000Z");
    expect(filters.q).toBe("0912");
    expect(filters.page).toBe(2);
    expect(orderFiltersQuery(filters, { page: 3 })).toBe(
      "?status=PROCESSING&from=%DB%B1%DB%B4%DB%B0%DB%B5%2F%DB%B0%DB%B7%2F%DB%B0%DB%B1&to=1405%2F07%2F01&q=%DB%B0%DB%B9%DB%B1%DB%B2&page=3",
    );
  });

  it("مقدار نامعتبر نادیده گرفته یا گزارش می‌شود", () => {
    expect(
      parseOrderFilters({ status: "HACK", page: "-4" }).filters,
    ).toMatchObject({
      status: null,
      page: 1,
    });
    const bad = parseOrderFilters({ from: "1405/13/01" });
    expect(bad.error).toContain("نامعتبر");
    expect(bad.filters.from).toBeNull();
    expect(
      parseOrderFilters({ from: "1405/07/05", to: "1405/07/01" }).error,
    ).toContain("قبل از");
  });
});

describe("CSV", () => {
  it("BOM، نقل‌قول و خنثی‌سازی فرمول", () => {
    expect(csvCell('سلام، "دنیا"')).toBe('"سلام، ""دنیا"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('﻿a,b\r\n1,"x,y"\r\n');
  });
});
