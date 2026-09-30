import { describe, expect, it } from "vitest";

import {
  addDuplicateIssues,
  auditPage,
  parseSitemap,
  robotsBlocksAll,
  sameUrl,
} from "./audit";

const URL_ = "https://alihan.ir/products/baklava-gerdouyi";

function page(body: string, head = "") {
  return `<!doctype html><html lang="fa-IR" dir="rtl"><head>
<title>خرید باقلوا گردویی | علی حان</title>
<meta name="description" content="باقلوا گردویی تازه"/>
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
          '<h1>باقلوا گردویی</h1><img src="/a.webp" alt="باقلوا"/><img src="/b" alt=""/>',
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
      "https://alihan.ir/products",
    );
    expect(messages(wrong).some((m) => m.includes("یکی نیست"))).toBe(true);
    const relative = page("<h1>a</h1>").replace(
      URL_,
      "/products/baklava-gerdouyi",
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
        '<h1>a</h1><img src="/x.webp"/><p>{{تکمیل توسط علی حان: ساعات}}</p>',
        '<script type="application/ld+json">{bad</script><script type="application/ld+json">{"aggregateRating":{}}</script>',
      ),
    );
    expect(result).toEqual([
      "error: JSON-LD قابل parse نیست",
      "error: JSON-LD امتیاز یا نظر دارد (در نسخه ۱ ممنوع)",
      "error: 1 تصویر بدون alt",
      "error: 1 متن «{{تکمیل توسط علی حان…}}» هنوز جایگزین نشده",
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
        "https://a.ir/products/%D8%B3%D9%88%D8%AA%D9%84%D8%A7%D9%88%D8%A7",
        "https://a.ir/products/سوتلاوا/",
      ),
    ).toBe(true);
    expect(sameUrl("https://a.ir/x", "https://b.ir/x")).toBe(false);
  });
});
