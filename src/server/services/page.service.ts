import { cache } from "react";

import { isBuildWithoutDb } from "@/lib/build-phase";
import { parseFaq } from "@/lib/seo/faq";
import type { PageInput } from "@/lib/validation/content";
import type { FaqItem } from "@/lib/validation/seo";
import { getUniqueViolationTarget, UserFacingError } from "@/server/errors";
import { findSlugHistoryTarget } from "@/server/repositories/catalog-page.repository";
import {
  createPageRow,
  deleteWithRedirects,
  findPageById,
  findPageBySlug,
  listPageRows,
  listPublishedPageRows,
  updateWithSlugHistory,
} from "@/server/repositories/content.repository";
import { listSlugHistory } from "@/server/repositories/seo.repository";

import type { PageLookup } from "./catalog-page.service";
import { clearRedirectCache } from "./redirect.service";

/**
 * صفحات ثابت (SEO.md §۶.۴ و فاز S4). «درباره ما» و «تماس» طراحی اختصاصی
 * دارند و فقط متن/سئوی خود را از اینجا می‌گیرند؛ نامکشان ثابت است و حذف
 * نمی‌شوند. بقیه‌ی صفحات از مسیر catch-all با نامک خودشان رندر می‌شوند.
 */

export const FIXED_PAGE_SLUGS = new Set(["about", "contact"]);

export interface PageDto {
  id: string;
  slug: string;
  title: string;
  content: string;
  seoTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  isPublished: boolean;
  faq: FaqItem[];
  updatedAt: Date;
}

type PageRow = NonNullable<Awaited<ReturnType<typeof findPageById>>>;

function toDto(row: PageRow): PageDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    noindex: row.noindex,
    isPublished: row.isPublished,
    faq: parseFaq(row.faq),
    updatedAt: row.updatedAt,
  };
}

export async function listPages(): Promise<PageDto[]> {
  return (await listPageRows()).map(toDto);
}

export async function getPage(id: string): Promise<PageDto | null> {
  const row = await findPageById(id);
  return row ? toDto(row) : null;
}

/** صفحه‌ی منتشرشده برای مسیر عمومی؛ نامک قدیمی ⇒ ریدایرکت */
export const getPublishedPage = cache(
  async (slug: string): Promise<PageLookup<PageDto>> => {
    const row = await findPageBySlug(slug);
    if (row?.isPublished) return { kind: "found", data: toDto(row) };
    if (row) return { kind: "missing" };
    const id = await findSlugHistoryTarget("PAGE", slug);
    const target = id ? await findPageById(id) : null;
    return target?.isPublished
      ? { kind: "redirect", to: `/${target.slug}` }
      : { kind: "missing" };
  },
);

/** «درباره ما»/«تماس»: متن و سئو اگر منتشر شده باشد؛ وگرنه `null` (پیش‌فرض طراحی) */
export const getFixedPage = cache(
  async (slug: "about" | "contact"): Promise<PageDto | null> => {
    if (isBuildWithoutDb()) return null;
    const row = await findPageBySlug(slug);
    return row?.isPublished ? toDto(row) : null;
  },
);

/** صفحات منتشرشده (فوتر و sitemap) */
export const listPublishedPages = cache(async () => {
  if (isBuildWithoutDb()) return [];
  return listPublishedPageRows();
});

function translateConflict(error: unknown): never {
  if (getUniqueViolationTarget(error)?.includes("slug")) {
    throw new UserFacingError(
      "این نامک قبلاً برای صفحه‌ی دیگری استفاده شده است.",
    );
  }
  throw error;
}

function pageFields(input: PageInput) {
  return {
    title: input.title,
    slug: input.slug,
    content: input.content,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    noindex: input.noindex,
    isPublished: input.isPublished,
    faq: input.faq,
  };
}

export async function createPage(input: PageInput): Promise<{ id: string }> {
  try {
    const { id } = await createPageRow(pageFields(input));
    return { id };
  } catch (error) {
    return translateConflict(error);
  }
}

export async function updatePage(
  id: string,
  input: PageInput,
): Promise<{ id: string }> {
  const existing = await findPageById(id);
  if (!existing) throw new UserFacingError("صفحه یافت نشد.");
  if (FIXED_PAGE_SLUGS.has(existing.slug) && input.slug !== existing.slug) {
    throw new UserFacingError(
      "نامک صفحه‌های «درباره ما» و «تماس» ثابت است (طراحی اختصاصی دارند).",
    );
  }
  const slugChanged = input.slug !== existing.slug;
  try {
    await updateWithSlugHistory(
      "page",
      id,
      pageFields(input),
      slugChanged ? { from: existing.slug, to: input.slug } : null,
    );
  } catch (error) {
    return translateConflict(error);
  }
  return { id };
}

/** حذف صفحه ⇒ آدرسش (و نامک‌های قبلی) به صفحه‌ی اصلی ریدایرکت می‌شود */
export async function deletePage(id: string): Promise<void> {
  const existing = await findPageById(id);
  if (!existing) throw new UserFacingError("صفحه یافت نشد.");
  if (FIXED_PAGE_SLUGS.has(existing.slug)) {
    throw new UserFacingError(
      "«درباره ما» و «تماس» حذف نمی‌شوند؛ برای برگشت به متن پیش‌فرض، از انتشار خارجشان کنید.",
    );
  }
  const history = await listSlugHistory("PAGE", id);
  await deleteWithRedirects("page", {
    id,
    fromPaths: [existing.slug, ...history.map((h) => h.oldSlug)].map(
      (slug) => `/${slug}`,
    ),
    toPath: "/",
    note: "حذف صفحه",
  });
  clearRedirectCache();
}
