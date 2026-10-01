import { describe, expect, it } from "vitest";

import {
  addDuplicateIssues,
  auditPage,
  parseSitemap,
  robotsBlocksAll,
  sameUrl,
} from "./audit";
import { COMPLETION_MARKER, todo } from "./settings";

const URL_ = "https://alocapsule.ir/products/charge-butane";

function page(body: string, head = "") {
  return `<!doctype html><html lang="fa-IR" dir="rtl"><head>
<title>خرید شارژ بوتان | الو کپسول</title>
<meta name="description" content="شارژ بوتان تازه"/>
<link rel="canonical" href="${URL_}"/>
<meta name="robots" content="index, follow"/>
${head}</head><body>${body}</body></html>`;
}

const messages = (html: string, indexingClosed = false, status = 200) =>
  auditPage({ url: URL_, status, html, indexingClosed }).issues.map(
    (issue) => `${issue.level}: ${issue.message}`,
  );

describe("auditPage", () => {
  it("صفحه‌ی سالم ⇒ بدون مشکل", () => {
    expect(
      messages(
        page(
          '<h1>شارژ بوتان</h1><img src="/a.webp" alt="کپسول"/><img src="/b" alt=""/>',
          '<script type="application/ld+json">{"@type":"Product","name":"x"}</script>',
        ),
      ),
    ).toEqual([]);
  });

  it("وضعیت غیر 200", () => {
    expect(messages("", false, 301)[0]).toContain("301");
  });

  it("H1 صفر یا چندتا، عنوان و canonical", () => {
    expect(messages(page("<p>بدون تیتر</p>"))).toContain(
      "error: 0 تگ H1 (باید دقیقاً یکی باشد)",
    );
    expect(messages(page("<h1>a</h1><h1 class='x'>b</h1>"))).toContain(
      "error: 2 تگ H1 (باید دقیقاً یکی باشد)",
    );
    const noCanonical = page("<h1>a</h1>").replace(
      /<link rel="canonical"[^>]*>/,
      "",
    );
    expect(messages(noCanonical)).toContain("error: canonical ندارد");
    const wrong = page("<h1>a</h1>").replace(
      URL_,
      "https://alocapsule.ir/products",
    );
    expect(messages(wrong).some((m) => m.includes("یکی نیست"))).toBe(true);
    const relative = page("<h1>a</h1>").replace(
      URL_,
      "/products/charge-butane",
    );
    expect(messages(relative).some((m) => m.includes("مطلق نیست"))).toBe(true);
  });

  it("noindex داخل sitemap خطاست مگر سایت عمداً بسته باشد", () => {
    const html = page("<h1>a</h1>").replace(
      "index, follow",
      "noindex, nofollow",
    );
    expect(messages(html)).toContain(
      "error: صفحه‌ی داخل sitemap متای noindex دارد",
    );
    expect(messages(html, true)).toEqual([]);
  });

  it("JSON-LD خراب، امتیاز، تصویر بدون alt و متن جای‌نگهدار", () => {
    const result = messages(
      page(
        `<h1>a</h1><img src="/x.webp"/><p>${todo("ساعات")}</p>`,
        '<script type="application/ld+json">{bad</script><script type="application/ld+json">{"aggregateRating":{}}</script>',
      ),
    );
    expect(result).toEqual([
      "error: JSON-LD قابل parse نیست",
      "error: JSON-LD امتیاز یا نظر دارد (در نسخه ۱ ممنوع)",
      "error: 1 تصویر بدون alt",
      `error: 1 متن «${COMPLETION_MARKER}…}}» هنوز جایگزین نشده`,
    ]);
  });

  it("متای خالی و زبان ⇒ هشدار", () => {
    const html = page("<h1>a</h1>")
      .replace(/<meta name="description"[^>]*>/, "")
      .replace('lang="fa-IR"', 'lang="en"');
    expect(messages(html)).toEqual([
      "warn: توضیحات متا خالی است",
      'warn: زبان صفحه lang="fa-IR" نیست',
    ]);
  });
});

describe("addDuplicateIssues", () => {
  it("عنوان تکراری روی هر دو صفحه ثبت می‌شود", () => {
    const a = auditPage({
      url: `${URL_}-a`,
      status: 200,
      html: page("<h1>x</h1>"),
      indexingClosed: false,
    });
    const b = auditPage({
      url: `${URL_}-b`,
      status: 200,
      html: page("<h1>y</h1>"),
      indexingClosed: false,
    });
    addDuplicateIssues([a, b]);
    expect(a.issues.some((i) => i.message.startsWith("عنوان تکراری"))).toBe(
      true,
    );
    expect(
      b.issues.some((i) => i.message.startsWith("توضیحات متا تکراری")),
    ).toBe(true);
  });
});

describe("sitemap، robots و مقایسه‌ی آدرس", () => {
  it("parseSitemap با entity", () => {
    expect(
      parseSitemap(
        "<urlset><url><loc>https://a.ir/</loc></url><url><loc> https://a.ir/x?a=1&amp;b=2 </loc></url></urlset>",
      ),
    ).toEqual(["https://a.ir/", "https://a.ir/x?a=1&b=2"]);
  });

  it("robotsBlocksAll", () => {
    expect(robotsBlocksAll("User-Agent: *\nDisallow: /\n")).toBe(true);
    expect(robotsBlocksAll("User-Agent: *\nAllow: /\nDisallow: /admin\n")).toBe(
      false,
    );
    expect(
      robotsBlocksAll("User-Agent: bad\nDisallow: /\nUser-Agent: *\nAllow: /"),
    ).toBe(false);
  });

  it("sameUrl: درصد-کد و اسلش", () => {
    expect(
      sameUrl(
        "https://a.ir/products/%D8%A8%D9%88%D8%AA%D8%A7%D9%86",
        "https://a.ir/products/بوتان/",
      ),
    ).toBe(true);
    expect(sameUrl("https://a.ir/x", "https://b.ir/x")).toBe(false);
  });
});

describe("auditPage: --allow-placeholders", () => {
  const html = page(`<h1>الف</h1><p>${todo("ساعات پاسخگویی")}</p>`);

  it("جای‌نگهدار ⇒ 🟠 و متن توضیحش برای فهرست کارفرما برمی‌گردد", () => {
    const result = auditPage({
      url: URL_,
      status: 200,
      html,
      indexingClosed: false,
      placeholderLevel: "warn",
    });
    expect(result.issues.map((i) => i.level)).toEqual(["warn"]);
    expect(result.placeholders).toEqual([todo("ساعات پاسخگویی")]);
  });

  it("پیش‌فرض ⇒ خطا", () => {
    const result = auditPage({
      url: URL_,
      status: 200,
      html,
      indexingClosed: false,
    });
    expect(result.issues.map((i) => i.level)).toEqual(["error"]);
  });

  it("جای‌نگهدار داخل <script> (داده‌ی RSC) شمرده نمی‌شود", () => {
    const result = auditPage({
      url: URL_,
      status: 200,
      html: page("<h1>الف</h1>", `<script>self.x="${todo("x")}"</script>`),
      indexingClosed: false,
    });
    expect(result.placeholders).toEqual([]);
  });
});
