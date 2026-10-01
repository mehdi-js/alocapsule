import { describe, expect, it } from "vitest";

import {
  catalogCategories,
  catalogProducts,
} from "../../../prisma/seed-catalog";
import { SEED_REDIRECTS } from "../../../prisma/seed-redirects";
import {
  normalizeRedirectPath,
  normalizeRedirectTarget,
  type RedirectRule,
  resolveRedirect,
} from "./redirects";

/** SEO.md §۹.۱: ریدایرکت‌های سایت قبلی */

const rows = SEED_REDIRECTS.map(({ from, to }) => ({
  from: normalizeRedirectPath(from),
  to: normalizeRedirectTarget(to)!,
}));
const rules = new Map<string, RedirectRule>(
  rows.map((row) => [row.from, { toPath: row.to, statusCode: 301 }]),
);

describe("seed ریدایرکت‌های سایت قبلی", () => {
  it("۲۵ ردیف جدول ۹.۱ منهای دو ردیف خودارجاع (/contact و /cart)", () => {
    expect(SEED_REDIRECTS).toHaveLength(25);
    expect(new Set(rows.map((r) => r.from)).size).toBe(25);
  });

  it("مبدأ نرمال‌شده: ارقام لاتین، بدون اسلش انتهایی، حروف فارسی دست‌نخورده", () => {
    expect(rows[0]!.from).toBe("/product/شارژ-کپسول-گاز-11-کیلویی-بوتان");
    expect(rows.some((r) => /[۰-۹]/.test(r.from))).toBe(false);
    expect(rows.some((r) => r.from.length > 1 && r.from.endsWith("/"))).toBe(
      false,
    );
  });

  it("شارژ: ۸ آدرس (اندازه × نوع شیر) با پارامتر valve درست", () => {
    const map = Object.fromEntries(
      rows
        .filter((r) => r.from.includes("شارژ-کپسول-گاز-"))
        .map((r) => [r.from, r.to]),
    );
    expect(map["/product/شارژ-کپسول-گاز-11-کیلویی-بوتان"]).toBe(
      "/products/gas-capsule-refill-11kg?valve=butane",
    );
    expect(map["/product/شارژ-کپسول-گاز-50-کیلویی-پرسی"]).toBe(
      "/products/gas-capsule-refill-50kg?valve=persi",
    );
    expect(Object.keys(map)).toHaveLength(8);
  });

  it("نسخه‌ی فارسی/لاتین رقم و درصد-کدشده یک مبدأ را می‌دهند", () => {
    const target = "/products/gas-capsule-refill-11kg?valve=butane";
    for (const path of [
      "/product/شارژ-کپسول-گاز-۱۱-کیلویی-بوتان/",
      "/product/شارژ-کپسول-گاز-11-کیلویی-بوتان/",
      encodeURI("/product/شارژ-کپسول-گاز-۱۱-کیلویی-بوتان/"),
      "/product/شارژ-کپسول-گاز-١١-کیلویی-بوتان",
    ]) {
      expect(resolveRedirect(rules, normalizeRedirectPath(path))).toEqual({
        kind: "redirect",
        to: target,
      });
    }
  });

  it("همه‌ی مقصدهای محصول و دسته به نامک‌های seed می‌رسند؛ بدون حلقه و زنجیره", () => {
    const products = new Set(catalogProducts.map((p) => p.slug));
    const categories = new Set(catalogCategories.map((c) => c.slug));
    const internal = new Set([
      "/",
      "/products",
      "/about",
      "/account",
      "/login",
    ]);
    for (const { from, to } of rows) {
      const path = to.split("?")[0]!;
      const ok =
        internal.has(path) ||
        (path.startsWith("/products/") && products.has(path.slice(10))) ||
        (path.startsWith("/category/") && categories.has(path.slice(10)));
      expect(ok, `${from} → ${to}`).toBe(true);
      expect(normalizeRedirectPath(to)).not.toBe(from);
      // مقصد خودش مبدأ ردیف دیگری نیست
      expect(rules.has(normalizeRedirectPath(to)), `${from} → ${to}`).toBe(
        false,
      );
    }
  });

  it("دسته‌ها و صفحه‌های اصلی طبق جدول", () => {
    const map = Object.fromEntries(rows.map((r) => [r.from, r.to]));
    expect(map["/product-category/شارژ-کپسول-گاز"]).toBe(
      "/category/gas-capsule-refill",
    );
    expect(map["/product-category/خرید-کپسول-گاز"]).toBe(
      "/category/buy-gas-capsule",
    );
    expect(map["/product-category/خرید-پیک-نیک"]).toBe("/products/picnic-gas");
    expect(map["/product-category/شارژ-کپسول-اکسیژن"]).toBe(
      "/products/oxygen-capsule-refill",
    );
    expect(map["/shop"]).toBe("/products");
    expect(map["/home"]).toBe("/");
    expect(map["/about-us"]).toBe("/about");
    expect(map["/dashboard"]).toBe("/account");
    expect(map["/auth"]).toBe("/login");
    expect(map["/blog"]).toBe("/");
    expect(map["/product/شارژ-کپسول-اکسیژن-40-کیلویی"]).toBe(
      "/products/oxygen-capsule-refill",
    );
    expect(map["/product/شارژ-کپسول-گازهای-ترکیبی"]).toBe(
      "/products/industrial-gas-refill",
    );
    expect(map["/product/خرید-پیک-نیک"]).toBe("/products/picnic-gas");
  });
});
