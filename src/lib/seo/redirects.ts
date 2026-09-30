/**
 * ریدایرکت‌ها و مهاجرت از وردپرس (SEO.md §۱۱). همه خالص‌اند؛ middleware،
 * پنل ادمین و ورود CSV از همین‌ها استفاده می‌کنند.
 */

export type RedirectStatus = 301 | 410;

export interface RedirectRule {
  toPath: string;
  statusCode: RedirectStatus;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * مسیر قابل مقایسه: فقط pathname (بدون query/hash)، decode درصدی (slugهای
 * فارسی قدیمی)، ی/ک عربی ⇒ فارسی، حروف لاتین کوچک، بدون `//` و اسلش انتهایی.
 * آدرس کامل (`https://old.site/x`) هم پذیرفته می‌شود.
 */
export function normalizeRedirectPath(input: string): string {
  let path = input.trim();
  const absolute = /^https?:\/\/[^/]+(.*)$/i.exec(path);
  if (absolute) path = absolute[1] || "/";
  path = path.split(/[?#]/)[0] ?? "";
  path = path
    .split("/")
    .map((segment) => safeDecode(segment))
    .join("/")
    .normalize("NFC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase()
    .replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

/** مقصد: مسیر داخلی یا آدرس کامل https؛ مسیر داخلی نرمال می‌شود */
export function normalizeRedirectTarget(input: string): string | null {
  const value = input.trim();
  if (/^https?:\/\/[^\s/]+\S*$/i.test(value)) return value;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const [path, query] = value.split("?");
  const normalized = normalizeRedirectPath(path ?? "/");
  return query ? `${normalized}?${query}` : normalized;
}

/**
 * درخواست‌های اسکنرها و ربات‌های مخرب در لاگ ۴۰۴ ثبت نمی‌شوند
 * (SEO.md §۱۰.۴): wp-login، فایل‌های پیکربندی، php و مسیرهای مدیریتی رایج.
 */
const JUNK_PATTERNS = [
  /^\/wp-(login|admin|includes)(\/|\.php|$)/,
  /\.(php\d?|asp|aspx|jsp|cgi|env|ini|log|sql|bak|old|swp|git|ds_store|yml|yaml)$/,
  /(^|\/)\.(env|git|svn|hg|aws|ssh|vscode|idea|htaccess|htpasswd)(\/|$)/,
  /^\/(phpmyadmin|pma|myadmin|cgi-bin|vendor|boaform|actuator|autodiscover|owa|ecp|hnap1|solr|druid|console|manager|server-status|telescope|_ignition)(\/|$)/,
  /^\/\.well-known\/(?!security\.txt)/,
  /^\/(favicon|apple-touch-icon)[^/]*\.(png|ico)$/,
];

export function isJunkPath(path: string): boolean {
  return JUNK_PATTERNS.some((pattern) => pattern.test(path));
}

export type LegacyResult =
  | {
      kind: "redirect";
      to: string;
      /** برای نگاشت دستی در لاگ ۴۰۴ هم ثبت شود */ log: boolean;
    }
  | { kind: "gone" };

/**
 * قواعد الگویی پیش‌فرض ووکامرس (SEO.md §۱۱.۲)؛ فقط وقتی ردیف دقیق در جدول
 * ریدایرکت نیست. `path` نرمال‌شده، `search` رشته‌ی query خام.
 */
export function legacyRule(path: string, search: string): LegacyResult | null {
  const params = new URLSearchParams(search);
  if (path === "/" && (params.has("add-to-cart") || params.has("p"))) {
    return { kind: "redirect", to: "/", log: false };
  }
  if (path === "/shop" || path.startsWith("/shop/")) {
    return { kind: "redirect", to: "/products", log: false };
  }
  if (path.startsWith("/product/") || path.startsWith("/product-category/")) {
    return { kind: "redirect", to: "/products", log: true };
  }
  if (path === "/my-account" || path.startsWith("/my-account/")) {
    return { kind: "redirect", to: "/account", log: false };
  }
  if (path === "/sitemap_index.xml" || /^\/[^/]+-sitemap\d*\.xml$/.test(path)) {
    return { kind: "redirect", to: "/sitemap.xml", log: false };
  }
  if (
    path === "/feed" ||
    path.endsWith("/feed") ||
    path === "/wp-json" ||
    path.startsWith("/wp-json/") ||
    path === "/xmlrpc.php" ||
    path.startsWith("/wp-content/uploads/")
  ) {
    return { kind: "gone" };
  }
  return null;
}

export type ResolvedRedirect =
  { kind: "redirect"; to: string } | { kind: "gone" };

/**
 * دنبال کردن زنجیره تا مقصد نهایی (حداکثر ۱۰ پرش) تا کاربر و گوگل مستقیم به
 * مقصد آخر بروند. حلقه ⇒ `null` (ریدایرکت نمی‌شود).
 */
export function resolveRedirect(
  rules: Map<string, RedirectRule>,
  from: string,
): ResolvedRedirect | null {
  let rule = rules.get(from);
  if (!rule) return null;
  const seen = new Set([from]);
  for (let hop = 0; hop < 10; hop++) {
    if (rule.statusCode === 410) return { kind: "gone" };
    const next = rules.get(normalizeRedirectPath(rule.toPath));
    if (!next || /^https?:/i.test(rule.toPath)) {
      return { kind: "redirect", to: rule.toPath };
    }
    const key = normalizeRedirectPath(rule.toPath);
    if (seen.has(key)) return null;
    seen.add(key);
    rule = next;
  }
  return null;
}

export type RedirectCheck =
  | {
      ok: true;
      /** مقصد خودش ریدایرکت دارد ⇒ مقصد نهایی پیشنهادی */ finalTarget:
        string | null;
    }
  | { ok: false; message: string };

/**
 * اعتبارسنجی ریدایرکت جدید در برابر جدول فعلی (SEO.md §۱۰.۳): حلقه (A→B→A)
 * رد می‌شود؛ زنجیره (مقصد خودش ریدایرکت دارد) مجاز است ولی مقصد نهایی
 * پیشنهاد می‌شود.
 */
export function checkRedirect(
  existing: Map<string, RedirectRule>,
  from: string,
  rule: RedirectRule,
): RedirectCheck {
  if (rule.statusCode === 410) return { ok: true, finalTarget: null };
  if (/^https?:/i.test(rule.toPath)) return { ok: true, finalTarget: null };
  const target = normalizeRedirectPath(rule.toPath);
  if (target === from) {
    return { ok: false, message: "مبدأ و مقصد ریدایرکت یکی است." };
  }
  const rules = new Map(existing);
  rules.set(from, rule);
  const resolved = resolveRedirect(rules, from);
  if (resolved === null) {
    return {
      ok: false,
      message: `این ریدایرکت حلقه می‌سازد (${from} ← … ← ${from}).`,
    };
  }
  const direct = existing.get(target);
  if (!direct) return { ok: true, finalTarget: null };
  return {
    ok: true,
    finalTarget: resolved.kind === "redirect" ? resolved.to : null,
  };
}

/** CSV ورود گروهی: `from,to,status` (سطر عنوان اختیاری) */
export interface CsvRedirectRow {
  line: number;
  from: string;
  to: string;
  status: RedirectStatus;
}

export function parseRedirectCsv(text: string): {
  rows: CsvRedirectRow[];
  errors: { line: number; message: string }[];
} {
  const rows: CsvRedirectRow[] = [];
  const errors: { line: number; message: string }[] = [];
  text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = index + 1;
      if (!raw.trim()) return;
      const cells = raw
        .split(",")
        .map((cell) => cell.trim().replace(/^"|"$/g, ""));
      if (line === 1 && /^from$/i.test(cells[0] ?? "")) return;
      const [from = "", to = "", statusText = "301"] = cells;
      const status = Number(statusText || "301");
      if (!from) {
        errors.push({ line, message: "ستون from خالی است" });
        return;
      }
      if (status !== 301 && status !== 410) {
        errors.push({ line, message: "status فقط 301 یا 410" });
        return;
      }
      if (status === 301 && !to) {
        errors.push({ line, message: "برای 301 ستون to لازم است" });
        return;
      }
      rows.push({ line, from, to, status });
    });
  return { rows, errors };
}
