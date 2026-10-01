/**
 * بررسی سئوی سایت در حال اجرا (SEO.md فاز S5):
 *
 *   npm run seo:audit -- https://alocapsule.ir
 *   npm run seo:audit -- http://localhost:3000 --concurrency 2
 *
 * robots.txt و sitemap.xml را می‌خواند، همه‌ی آدرس‌های sitemap را با
 * User-Agent گوگل‌بات می‌گیرد و گزارش می‌دهد: وضعیت HTTP، یک H1، عنوان/متای
 * خالی یا تکراری، canonical، noindex، JSON-LD، تصاویر بدون alt و متن
 * «{{تکمیل توسط <نام برند>…}}». با خطای 🔴 کد خروج ۱ است.
 *
 * `--allow-placeholders`: متن `{{تکمیل…}}` خطا نیست و 🟠 است (برای جدا کردن
 * نقص‌های ساختاری از داده‌ی در انتظار کارفرما؛ برای انتشار نباید استفاده شود).
 * در پایان فهرست یکتای همه‌ی جای‌نگهدارهای مانده چاپ می‌شود.
 *
 * آدرس‌های sitemap با دامنه‌ی `NEXT_PUBLIC_SITE_URL` ساخته شده‌اند؛ اگر
 * سایت دیگری (مثلاً localhost) بررسی می‌شود، درخواست‌ها به همان آدرس ورودی
 * فرستاده می‌شوند ولی canonical با آدرس sitemap مقایسه می‌شود.
 */
import {
  addDuplicateIssues,
  auditPage,
  type PageAudit,
  parseSitemap,
  robotsBlocksAll,
} from "@/lib/seo/audit";

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const TIMEOUT_MS = 20_000;

function parseArgs(argv: string[]) {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const base =
    positional[0] ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  return {
    allowPlaceholders: argv.includes("--allow-placeholders"),
    base: new URL(base).origin,
    concurrency: Math.max(1, Math.min(8, Number(flag("concurrency") ?? 4))),
  };
}

async function get(url: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": GOOGLEBOT_UA, "Accept-Language": "fa-IR,fa" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: response.status, text: await response.text() };
}

/** آدرس sitemap ⇒ همان مسیر روی سایتی که بررسی می‌شود */
function onBase(loc: string, base: string): string {
  const url = new URL(loc);
  return `${base}${url.pathname}${url.search}`;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]!);
      }
    }),
  );
  return results;
}

async function main() {
  const { base, concurrency, allowPlaceholders } = parseArgs(
    process.argv.slice(2),
  );
  console.log(`🔎 بررسی سئوی ${base}\n`);

  const robots = await get(`${base}/robots.txt`);
  const closed = robots.status === 200 && robotsBlocksAll(robots.text);
  if (robots.status !== 200) {
    console.log(`🔴 robots.txt وضعیت ${robots.status} دارد`);
  } else if (closed) {
    console.log(
      "🟠 robots.txt کل سایت را بسته است (ALLOW_INDEXING=true تنظیم نشده) — برای انتشار باید باز شود.",
    );
  } else {
    console.log("🟢 robots.txt سایت را برای گوگل باز گذاشته است.");
  }

  const sitemap = await get(`${base}/sitemap.xml`);
  if (sitemap.status !== 200) {
    console.error(
      `🔴 sitemap.xml وضعیت ${sitemap.status} دارد؛ بررسی متوقف شد.`,
    );
    process.exitCode = 1;
    return;
  }
  const locs = parseSitemap(sitemap.text);
  console.log(`🗺️  ${locs.length} آدرس در sitemap\n`);

  const pages: PageAudit[] = await mapLimit(locs, concurrency, async (loc) => {
    try {
      const { status, text } = await get(onBase(loc, base));
      return auditPage({
        url: loc,
        status,
        html: text,
        indexingClosed: closed,
        placeholderLevel: allowPlaceholders ? "warn" : "error",
      });
    } catch (error) {
      return {
        url: loc,
        status: 0,
        title: null,
        description: null,
        issues: [
          {
            level: "error" as const,
            message: `خطای شبکه: ${(error as Error).message}`,
          },
        ],
      };
    }
  });
  addDuplicateIssues(pages);

  let errors = 0;
  let warnings = 0;
  for (const page of pages) {
    const pageErrors = page.issues.filter((issue) => issue.level === "error");
    const pageWarnings = page.issues.filter((issue) => issue.level === "warn");
    errors += pageErrors.length;
    warnings += pageWarnings.length;
    const icon = pageErrors.length ? "🔴" : pageWarnings.length ? "🟠" : "🟢";
    console.log(
      `${icon} ${decodeURI(page.url)}${page.title ? ` — ${page.title}` : ""}`,
    );
    for (const issue of page.issues) {
      console.log(
        `    ${issue.level === "error" ? "🔴" : "🟠"} ${issue.message}`,
      );
    }
  }

  const remaining = new Map<string, number>();
  for (const page of pages) {
    for (const text of new Set(page.placeholders ?? [])) {
      remaining.set(text, (remaining.get(text) ?? 0) + 1);
    }
  }
  if (remaining.size > 0) {
    console.log(`\nجای‌نگهدارهای مانده (${remaining.size} مورد یکتا):`);
    for (const [text, count] of remaining) {
      console.log(`  - ${text}${count > 1 ? ` (${count} صفحه)` : ""}`);
    }
  }

  console.log(
    `\nخلاصه: ${pages.length} صفحه · ${errors} خطای 🔴 · ${warnings} هشدار 🟠${closed ? " · سایت برای گوگل بسته است" : ""}`,
  );
  if (errors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
