import { randomBytes } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { pageInputSchema, redirectInputSchema } from "@/lib/validation/content";

import {
  createPage,
  deletePage,
  getPublishedPage,
  updatePage,
} from "./page.service";
import {
  clearRedirectCache,
  importRedirectCsv,
  matchRedirect,
  recordNotFound,
  saveRedirect,
} from "./redirect.service";

/**
 * معیارهای فاز S4 (SEO.md §۱۳): ریدایرکت آدرس فارسی درصد-کدشده مستقیم به
 * مقصد نهایی، 410، لاگ ۴۰۴، رد حلقه با پیام فارسی، صفحات.
 */

const RUN = randomBytes(3).toString("hex");
const pageIds: string[] = [];

function redirect(from: string, to: string, statusCode: 301 | 410 = 301) {
  return saveRedirect(
    redirectInputSchema.parse({ fromPath: from, toPath: to, statusCode }),
  );
}

afterAll(async () => {
  await db.redirect.deleteMany({ where: { fromPath: { contains: RUN } } });
  await db.notFoundLog.deleteMany({ where: { path: { contains: RUN } } });
  await db.slugHistory.deleteMany({
    where: { entityId: { in: pageIds } },
  });
  await db.page.deleteMany({ where: { id: { in: pageIds } } });
  clearRedirectCache();
  await db.$disconnect();
});

describe("ریدایرکت‌ها", () => {
  it("آدرس فارسی درصد-کدشده ⇒ مستقیم به مقصد نهایی (زنجیره حل می‌شود)", async () => {
    const old = `/product/کپسول-گردویی-${RUN}`;
    await redirect(old, `/middle-${RUN}`);
    const second = await redirect(`/middle-${RUN}`, "/products/charge-butane");
    expect(second.finalTarget).toBeNull();

    const requested = `/product/${encodeURIComponent(`کپسول-گردویی-${RUN}`)}/`;
    expect(await matchRedirect(requested, "", null)).toEqual({
      kind: "redirect",
      to: "/products/charge-butane",
    });
    const row = await db.redirect.findUniqueOrThrow({
      where: { fromPath: old },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      (await db.redirect.findUniqueOrThrow({ where: { id: row.id } })).hits,
    ).toBeGreaterThanOrEqual(1);
  });

  it("زنجیره هنگام ساخت ⇒ پیشنهاد مقصد نهایی", async () => {
    await redirect(`/c1-${RUN}`, `/c2-${RUN}`);
    await redirect(`/c2-${RUN}`, "/about");
    const result = await redirect(`/c0-${RUN}`, `/c1-${RUN}`);
    expect(result.finalTarget).toBe("/about");
  });

  it("حلقه ⇒ رد با پیام فارسی", async () => {
    await redirect(`/loop-a-${RUN}`, `/loop-b-${RUN}`);
    await expect(redirect(`/loop-b-${RUN}`, `/loop-a-${RUN}`)).rejects.toThrow(
      "حلقه",
    );
  });

  it("410 از جدول و قواعد وردپرس", async () => {
    await redirect(`/gone-${RUN}`, "", 410);
    expect(await matchRedirect(`/gone-${RUN}`, "", null)).toEqual({
      kind: "gone",
    });
    expect(await matchRedirect("/wp-json/", "", null)).toEqual({
      kind: "gone",
    });
    // `/shop/` حالا ردیف seed دارد (P4)؛ قاعده‌ی الگویی برای زیرمسیرهای بدون ردیف است
    expect(await matchRedirect("/shop/page/2/", "", null)).toEqual({
      kind: "redirect",
      to: "/products",
      log: false,
    });
    expect(await matchRedirect("/products", "", null)).toBeNull();
  });

  it("ورود CSV: سطر سالم ذخیره، حلقه و خطا با شماره‌ی سطر", async () => {
    const result = await importRedirectCsv(
      [
        "from,to,status",
        `/csv-a-${RUN},/products,301`,
        `/csv-b-${RUN},,410`,
        `/csv-c-${RUN},/csv-d-${RUN},301`,
        `/csv-d-${RUN},/csv-c-${RUN},301`,
        `/csv-e-${RUN},javascript:alert(1),301`,
      ].join("\n"),
    );
    expect(result.saved).toBe(3);
    expect(result.errors.map((e) => e.line)).toEqual([5, 6]);
    expect(result.errors[0]?.message).toContain("حلقه");
  });
});

describe("لاگ ۴۰۴", () => {
  it("ثبت و شمارش؛ اسکنرها ثبت نمی‌شوند؛ ساخت ریدایرکت پاکش می‌کند", async () => {
    await recordNotFound(`/missing-${RUN}`, "https://google.com/");
    await recordNotFound(`/missing-${RUN}/`, null);
    const row = await db.notFoundLog.findUniqueOrThrow({
      where: { path: `/missing-${RUN}` },
    });
    expect(row.hits).toBe(2);
    expect(row.lastReferrer).toBe("https://google.com/");

    await recordNotFound(`/wp-login.php?x=${RUN}`, null);
    expect(
      await db.notFoundLog.count({ where: { path: { contains: "wp-login" } } }),
    ).toBe(0);

    await redirect(`/missing-${RUN}`, "/products");
    expect(
      await db.notFoundLog.count({ where: { path: `/missing-${RUN}` } }),
    ).toBe(0);
  });
});

describe("صفحات", () => {
  it("صفحه: منتشرنشده ⇒ نیست؛ تغییر نامک ⇒ ریدایرکت؛ حذف ⇒ ریدایرکت به خانه", async () => {
    const input = (slug: string, isPublished: boolean) =>
      pageInputSchema.parse({
        title: "صفحه تست",
        slug,
        content: "متن",
        isPublished,
      });
    const { id } = await createPage(input(`page-a-${RUN}`, false));
    pageIds.push(id);
    expect((await getPublishedPage(`page-a-${RUN}`)).kind).toBe("missing");

    await updatePage(id, input(`page-b-${RUN}`, true));
    expect(await getPublishedPage(`page-a-${RUN}`)).toEqual({
      kind: "redirect",
      to: `/page-b-${RUN}`,
    });

    await deletePage(id);
    const redirects = await db.redirect.findMany({
      where: { fromPath: { in: [`/page-a-${RUN}`, `/page-b-${RUN}`] } },
    });
    expect(redirects.map((r) => r.toPath)).toEqual(["/", "/"]);
  });
});
