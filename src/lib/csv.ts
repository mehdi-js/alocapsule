/**
 * ساخت CSV برای Excel: BOM یوتی‌اف-۸ (تا فارسی درست باز شود)، خط جدید
 * CRLF، نقل‌قول در صورت نیاز. 🔴 مقدارِ شروع‌شده با `= + - @` (و tab/CR)
 * با `'` خنثی می‌شود تا در Excel فرمول اجرا نشود (CSV injection).
 */

export type CsvValue = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
