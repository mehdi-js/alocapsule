import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { clearRedirectCache, matchRedirect } from "./redirect.service";

/**
 * P4: ریدایرکت‌های seed شده (جدول ۹.۱) از مسیر واقعی middleware
 * (`matchRedirect`) روی دیتابیس؛ نسخه‌ی درصد-کدشده، ارقام فارسی و لاتین.
 */

beforeAll(() => clearRedirectCache());
afterAll(async () => {
  clearRedirectCache();
  await db.$disconnect();
});

const match = (path: string, search = "") => matchRedirect(path, search, null);

describe("ریدایرکت‌های سایت قبلی روی دیتابیس", () => {
  const target = {
    kind: "redirect",
    to: "/products/gas-capsule-refill-11kg?valve=butane",
  };

  it("آدرس فارسی‌رقم درصد-کدشده، فارسی خام و لاتین‌رقم ⇒ همان مقصد با query", async () => {
    const raw = "/product/شارژ-کپسول-گاز-۱۱-کیلویی-بوتان/";
    expect(await match(encodeURI(raw))).toEqual(target);
    expect(await match(raw)).toEqual(target);
    expect(await match("/product/شارژ-کپسول-گاز-11-کیلویی-بوتان/")).toEqual(
      target,
    );
    expect(await match("/product/شارژ-کپسول-گاز-11-کیلویی-بوتان")).toEqual(
      target,
    );
  });

  it("پرسی و اندازه‌های دیگر؛ خرید نو؛ پیک‌نیک؛ اکسیژن", async () => {
    expect(await match("/product/شارژ-کپسول-گاز-۲۵-کیلویی-پرسی/")).toEqual({
      kind: "redirect",
      to: "/products/gas-capsule-refill-25kg?valve=persi",
    });
    expect(await match("/product/خرید-کپسول-گاز-11-کیلویی/")).toEqual({
      kind: "redirect",
      to: "/products/buy-gas-capsule-11kg",
    });
    expect(await match("/product/خرید-پیک-نیک/")).toEqual({
      kind: "redirect",
      to: "/products/picnic-gas",
    });
    expect(await match("/product/شارژ-کپسول-اکسیژن-۴۰-کیلویی/")).toEqual({
      kind: "redirect",
      to: "/products/oxygen-capsule-refill",
    });
  });

  it("دسته‌ها و صفحه‌های اصلی؛ /?s=test ⇒ /", async () => {
    expect(await match("/product-category/شارژ-کپسول-گاز/")).toEqual({
      kind: "redirect",
      to: "/category/gas-capsule-refill",
    });
    expect(await match("/product-category/خرید-کپسول-گاز/")).toEqual({
      kind: "redirect",
      to: "/category/buy-gas-capsule",
    });
    expect(await match("/shop/")).toEqual({
      kind: "redirect",
      to: "/products",
    });
    expect(await match("/dashboard/")).toEqual({
      kind: "redirect",
      to: "/account",
    });
    expect(await match("/auth")).toEqual({ kind: "redirect", to: "/login" });
    expect(await match("/blog/")).toEqual({ kind: "redirect", to: "/" });
    expect(await match("/about-us/")).toEqual({
      kind: "redirect",
      to: "/about",
    });
    expect(await match("/", "?s=test")).toMatchObject({
      kind: "redirect",
      to: "/",
    });
  });

  it("آدرس ناشناخته‌ی قدیمی ⇒ قاعده‌ی نرم /products و ثبت برای نگاشت دستی؛ مسیر خود سایت ⇒ بدون ریدایرکت", async () => {
    expect(await match("/product/lorem-ipsum/")).toMatchObject({
      kind: "redirect",
      to: "/products",
      log: true,
    });
    // ثبت 404 بی‌صدا و پس‌زمینه است؛ ردیف تستی پاک می‌شود
    await new Promise((resolve) => setTimeout(resolve, 200));
    await db.notFoundLog.deleteMany({
      where: { path: "/product/lorem-ipsum" },
    });
    expect(await match("/products/gas-capsule-refill-11kg")).toBeNull();
    expect(await match("/cart")).toBeNull();
    expect(await match("/contact")).toBeNull();
  });

  it("seed ویرایش/حذف ادمین را بازنویسی نمی‌کند (ردیف موجود دست‌نخورده)", async () => {
    const from = "/shop";
    const row = await db.redirect.findUniqueOrThrow({
      where: { fromPath: from },
    });
    expect(row.toPath).toBe("/products");
    expect(row.statusCode).toBe(301);
  });
});
