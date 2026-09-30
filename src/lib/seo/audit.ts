import { COMPLETION_MARKER } from "./settings";

/**
 * بررسی سئوی صفحات سایت در حال اجرا (SEO.md فاز S5، `npm run seo:audit`).
 * توابع خالص روی HTML؛ اسکریپت `scripts/seo-audit.ts` آن‌ها را روی همه‌ی
 * آدرس‌های sitemap اجرا می‌کند.
 */

export type AuditLevel = "error" | "warn";

export interface AuditIssue {
  level: AuditLevel;
  message: string;
}

export interface PageAudit {
  url: string;
  status: number;
  title: string | null;
  description: string | null;
  issues: AuditIssue[];
}

/** آدرس‌های `<loc>` یک sitemap */
export function parseSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) =>
    decodeXml(match[1]!),
  );
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`,
    "i",
  ).exec(tag);
  return match ? decodeXml(match[2] ?? match[3] ?? "") : null;
}

function metaContent(html: string, name: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(tag, "name") ?? attr(tag, "property"))?.toLowerCase() === name) {
      return attr(tag, "content");
    }
  }
  return null;
}

/** مقایسه‌ی دو آدرس بدون حساسیت به کدگذاری درصدی و اسلش انتهایی */
export function sameUrl(a: string, b: string): boolean {
  const normalize = (value: string) => {
    try {
      const url = new URL(value);
      const path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
      return `${url.origin}${path}${url.search}`;
    } catch {
      return value;
    }
  };
  return normalize(a) === normalize(b);
}

/**
 * چک‌های یک صفحه: وضعیت 200، دقیقاً یک H1، عنوان و متا، canonical برابر آدرس
 * sitemap، noindex نبودن، JSON-LD سالم و بدون امتیاز/نظر، alt همه‌ی
 * تصاویر، زبان صفحه و نبود متن جای‌نگهدار.
 */
export function auditPage(params: {
  url: string;
  status: number;
  html: string;
  /** سایت با ALLOW_INDEXING بسته است ⇒ noindex صفحه خطا حساب نمی‌شود */
  indexingClosed: boolean;
}): PageAudit {
  const { url, status, html } = params;
  const issues: AuditIssue[] = [];
  const error = (message: string) => issues.push({ level: "error", message });
  const warn = (message: string) => issues.push({ level: "warn", message });

  if (status !== 200) {
    error(`وضعیت HTTP ${status} (صفحه‌ی sitemap باید 200 باشد)`);
    return { url, status, title: null, description: null, issues };
  }

  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1Count !== 1) error(`${h1Count} تگ H1 (باید دقیقاً یکی باشد)`);

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeXml(titleMatch[1]!.trim()) : null;
  if (!title) error("عنوان (<title>) خالی است");

  const description = metaContent(html, "description")?.trim() || null;
  if (!description) warn("توضیحات متا خالی است");

  const canonicalTag = (html.match(/<link\b[^>]*>/gi) ?? []).find(
    (tag) => attr(tag, "rel")?.toLowerCase() === "canonical",
  );
  const canonical = canonicalTag ? attr(canonicalTag, "href") : null;
  if (!canonical) error("canonical ندارد");
  else if (!/^https?:\/\//i.test(canonical))
    error(`canonical مطلق نیست: ${canonical}`);
  else if (!sameUrl(canonical, url))
    error(`canonical با آدرس sitemap یکی نیست: ${canonical}`);

  const robots = metaContent(html, "robots")?.toLowerCase() ?? "";
  if (robots.includes("noindex") && !params.indexingClosed) {
    error("صفحه‌ی داخل sitemap متای noindex دارد");
  }

  if (!/<html[^>]*\slang=["']fa-IR["']/i.test(html))
    warn('زبان صفحه lang="fa-IR" نیست');

  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const json = match[1]!;
    try {
      JSON.parse(json);
    } catch {
      error("JSON-LD قابل parse نیست");
      continue;
    }
    if (/"(aggregateRating|review)"/.test(json)) {
      error("JSON-LD امتیاز یا نظر دارد (در نسخه ۱ ممنوع)");
    }
  }

  const imagesWithoutAlt = (html.match(/<img\b[^>]*>/gi) ?? []).filter(
    (tag) => attr(tag, "alt") === null,
  ).length;
  if (imagesWithoutAlt > 0) error(`${imagesWithoutAlt} تصویر بدون alt`);

  // فقط متن قابل مشاهده (داده‌ی RSC داخل <script> همان متن را تکرار می‌کند)
  const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const placeholders = visible.split(COMPLETION_MARKER).length - 1;
  if (placeholders > 0) {
    error(`${placeholders} متن «{{تکمیل توسط علی حان…}}» هنوز جایگزین نشده`);
  }

  return { url, status, title, description, issues };
}

/** عنوان یا متای تکراری بین صفحات (هر مورد به همه‌ی صفحات درگیر اضافه می‌شود) */
export function addDuplicateIssues(pages: PageAudit[]): void {
  const check = (field: "title" | "description", label: string) => {
    const groups = new Map<string, PageAudit[]>();
    for (const page of pages) {
      const value = page[field]?.trim();
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), page]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const page of group) {
        const others = group
          .filter((other) => other !== page)
          .map((o) => o.url);
        page.issues.push({
          level: "error",
          message: `${label} تکراری با ${others.join("، ")}`,
        });
      }
    }
  };
  check("title", "عنوان");
  check("description", "توضیحات متا");
}

/** robots.txt کل سایت را بسته است؟ (`Disallow: /` برای همه) */
export function robotsBlocksAll(robotsTxt: string): boolean {
  let appliesToAll = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key ?? "")) appliesToAll = value === "*";
    else if (appliesToAll && /^disallow$/i.test(key ?? "") && value === "/") {
      return true;
    }
  }
  return false;
}
