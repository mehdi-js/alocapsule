import { describe, expect, it } from "vitest";

import {
  checkRedirect,
  isJunkPath,
  legacyRule,
  normalizeRedirectPath,
  normalizeRedirectTarget,
  parseRedirectCsv,
  type RedirectRule,
  resolveRedirect,
} from "./redirects";

const rules = (entries: [string, string, 301 | 410][]) =>
  new Map<string, RedirectRule>(
    entries.map(([from, toPath, statusCode]) => [from, { toPath, statusCode }]),
  );

describe("normalizeRedirectPath", () => {
  it("decode درصدی فارسی، اسلش انتهایی، حروف کوچک، query", () => {
    const encoded = `/product/${encodeURIComponent("کپسول-گردویی")}/?utm_source=x`;
    expect(normalizeRedirectPath(encoded)).toBe("/product/کپسول-گردویی");
    expect(normalizeRedirectPath("/Shop//Capsule/")).toBe("/shop/capsule");
    expect(normalizeRedirectPath("https://old.alocapsule.ir/About-Us/")).toBe(
      "/about-us",
    );
    expect(normalizeRedirectPath("product/كيك")).toBe("/product/کیک");
    expect(normalizeRedirectPath("/")).toBe("/");
    expect(normalizeRedirectPath("/%E0%A4%A")).toBe("/%e0%a4%a");
  });

  it("مقصد: مسیر داخلی نرمال یا https؛ بقیه نامعتبر", () => {
    expect(normalizeRedirectTarget("/products/x/")).toBe("/products/x");
    expect(normalizeRedirectTarget("https://t.me/alocapsule")).toBe(
      "https://t.me/alocapsule",
    );
    expect(normalizeRedirectTarget("javascript:alert(1)")).toBeNull();
    expect(normalizeRedirectTarget("//evil.com")).toBeNull();
    expect(normalizeRedirectTarget("products")).toBeNull();
  });
});

describe("قواعد الگویی ووکامرس (SEO.md §۱۱.۲)", () => {
  it.each([
    ["/shop", "", { kind: "redirect", to: "/products", log: false }],
    ["/shop/page/2", "", { kind: "redirect", to: "/products", log: false }],
    ["/product/capsule", "", { kind: "redirect", to: "/products", log: true }],
    [
      "/product-category/x",
      "",
      { kind: "redirect", to: "/products", log: true },
    ],
    [
      "/my-account/orders",
      "",
      { kind: "redirect", to: "/account", log: false },
    ],
    [
      "/sitemap_index.xml",
      "",
      { kind: "redirect", to: "/sitemap.xml", log: false },
    ],
    [
      "/product-sitemap.xml",
      "",
      { kind: "redirect", to: "/sitemap.xml", log: false },
    ],
    ["/", "add-to-cart=12", { kind: "redirect", to: "/", log: false }],
    ["/", "p=45", { kind: "redirect", to: "/", log: false }],
    ["/feed", "", { kind: "gone" }],
    ["/blog/feed", "", { kind: "gone" }],
    ["/wp-json", "", { kind: "gone" }],
    ["/wp-json/wp/v2/posts", "", { kind: "gone" }],
    ["/xmlrpc.php", "", { kind: "gone" }],
    ["/wp-content/uploads/2023/01/a.jpg", "", { kind: "gone" }],
  ])("%s?%s", (path, search, expected) => {
    expect(legacyRule(path, search)).toEqual(expected);
  });

  it("مسیرهای سایت جدید دست نمی‌خورند", () => {
    for (const path of ["/", "/products", "/cart", "/checkout", "/about"]) {
      expect(legacyRule(path, "")).toBeNull();
    }
  });
});

describe("isJunkPath", () => {
  it("اسکنرها ثبت نمی‌شوند؛ مسیرهای عادی ثبت می‌شوند", () => {
    for (const path of [
      "/wp-login.php",
      "/.env",
      "/wp-admin/",
      "/phpmyadmin",
      "/x/.git/config",
      "/index.php",
    ]) {
      expect(isJunkPath(path)).toBe(true);
    }
    for (const path of ["/product/کپسول", "/about-us", "/blog/post-1"]) {
      expect(isJunkPath(path)).toBe(false);
    }
  });
});

describe("resolveRedirect", () => {
  it("زنجیره تا مقصد نهایی؛ 410 وسط زنجیره ⇒ gone", () => {
    const table = rules([
      ["/a", "/b", 301],
      ["/b", "/c/", 301],
      ["/c", "/final", 301],
      ["/x", "/dead", 301],
      ["/dead", "", 410],
    ]);
    expect(resolveRedirect(table, "/a")).toEqual({
      kind: "redirect",
      to: "/final",
    });
    expect(resolveRedirect(table, "/x")).toEqual({ kind: "gone" });
    expect(resolveRedirect(table, "/none")).toBeNull();
  });

  it("حلقه ⇒ null", () => {
    const table = rules([
      ["/a", "/b", 301],
      ["/b", "/a", 301],
    ]);
    expect(resolveRedirect(table, "/a")).toBeNull();
  });
});

describe("checkRedirect", () => {
  const table = rules([
    ["/b", "/c", 301],
    ["/c", "/final", 301],
  ]);

  it("حلقه ⇒ رد با پیام فارسی", () => {
    const result = checkRedirect(table, "/c", {
      toPath: "/b",
      statusCode: 301,
    });
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("حلقه");
    expect(
      checkRedirect(table, "/a", { toPath: "/a/", statusCode: 301 }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("زنجیره ⇒ مجاز با پیشنهاد مقصد نهایی", () => {
    expect(
      checkRedirect(table, "/a", { toPath: "/b", statusCode: 301 }),
    ).toEqual({
      ok: true,
      finalTarget: "/final",
    });
    expect(
      checkRedirect(table, "/a", { toPath: "/x", statusCode: 301 }),
    ).toEqual({
      ok: true,
      finalTarget: null,
    });
  });
});

describe("parseRedirectCsv", () => {
  it("سطر عنوان، status پیش‌فرض ۳۰۱، خطای هر سطر", () => {
    const { rows, errors } = parseRedirectCsv(
      "from,to,status\n/old,/new,301\n/gone,,410\n/x,/y\n,/z,301\n/q,/r,302\n/w,,301\n",
    );
    expect(rows.map((r) => [r.from, r.to, r.status])).toEqual([
      ["/old", "/new", 301],
      ["/gone", "", 410],
      ["/x", "/y", 301],
    ]);
    expect(errors.map((e) => e.line)).toEqual([5, 6, 7]);
  });
});
