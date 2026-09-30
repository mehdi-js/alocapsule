import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * 🔴 بند ۷.۱ سند: مسیر ثبت سفارش هیچ منطق موجودی و هیچ قفل ردیفی ندارد.
 * این تست جلوی اضافه شدن ناخواسته‌ی آن را در آینده می‌گیرد.
 */
const FILES = [
  "./order.service.ts",
  "./order-status.service.ts",
  "../repositories/order.repository.ts",
  "../repositories/order-status.repository.ts",
];

describe("ثبت سفارش بدون انبارداری", () => {
  it.each(FILES)("%s: بدون FOR UPDATE و فیلد موجودی", (file) => {
    const source = readFileSync(
      fileURLToPath(new URL(file, import.meta.url)),
      "utf8",
    );
    expect(source).not.toMatch(/FOR\s+(NO\s+KEY\s+)?UPDATE|FOR\s+SHARE/i);
    expect(source).not.toMatch(/\b(stock|inventory)\w*/i);
  });
});
