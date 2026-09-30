import { analyzeSeo, type SeoSummary, summarizeSeo } from "@/lib/seo/analyze";
import { findSeoConflicts } from "@/lib/seo/conflicts";
import { parseFaq } from "@/lib/seo/faq";
import type { CategoryInput } from "@/lib/validation/category";
import type { FaqItem } from "@/lib/validation/seo";
import {
  getUniqueViolationTarget,
  isRecordNotFound,
  UserFacingError,
} from "@/server/errors";
import {
  categorySlugExists,
  createCategoryRecord,
  deleteCategoryWithRedirects,
  findCategoryById,
  listAllCategories,
  updateCategoryRecord,
  updateCategoryWithSlugHistory,
} from "@/server/repositories/category.repository";
import {
  listSeoIndex,
  listSlugHistory,
} from "@/server/repositories/seo.repository";

import { conflictWarning, getSeoConflicts } from "./seo-conflicts.service";
import { getTitleSettings } from "./seo-settings.service";

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  productCount: number;
  childCount: number;
  /** عمق در درخت (۰ = دسته‌ی اصلی) برای تورفتگی در لیست */
  depth: number;
}

export interface CategoryListItem extends CategoryDto {
  seo: SeoSummary;
}

export interface CategoryEditDto {
  id: string;
  name: string;
  slug: string;
  h1: string | null;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  introText: string | null;
  bottomContent: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  noindex: boolean;
  faq: FaqItem[];
}

type CategoryRecord = Awaited<ReturnType<typeof listAllCategories>>[number];

function toDto(category: CategoryRecord, depth: number): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    isFeatured: category.isFeatured,
    productCount: category._count.products,
    childCount: category._count.children,
    depth,
  };
}

/** لیست تخت‌شده‌ی درخت: هر دسته زیر والدش و به ترتیب `sortOrder`. */
export async function listCategories(): Promise<CategoryDto[]> {
  const all = await listAllCategories();
  const byParent = new Map<string | null, CategoryRecord[]>();
  for (const category of all) {
    const siblings = byParent.get(category.parentId) ?? [];
    siblings.push(category);
    byParent.set(category.parentId, siblings);
  }

  const result: CategoryDto[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const category of byParent.get(parentId) ?? []) {
      result.push(toDto(category, depth));
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** لیست درخت دسته‌ها با وضعیت سئو (صفحه‌ی «دسته‌بندی‌ها») */
export async function listCategoriesWithSeo(): Promise<CategoryListItem[]> {
  const [categories, all, seoIndex, titleSettings] = await Promise.all([
    listCategories(),
    listAllCategories(),
    listSeoIndex(),
    getTitleSettings(),
  ]);
  const byId = new Map(all.map((category) => [category.id, category]));
  return categories.map((dto) => {
    const record = byId.get(dto.id)!;
    const checks = analyzeSeo({
      name: record.name,
      seoTitle: record.seoTitle,
      metaDescription: record.metaDescription,
      focusKeyword: record.focusKeyword,
      text: [record.introText, record.bottomContent]
        .filter(Boolean)
        .join("\n\n"),
      images: null,
      noindex: record.noindex,
      titleSettings,
      conflicts: findSeoConflicts(seoIndex, { kind: "category", ...record }),
    });
    return { ...dto, seo: summarizeSeo(checks) };
  });
}

export async function getCategoryForEdit(
  id: string,
): Promise<CategoryEditDto | null> {
  const category = await findCategoryById(id);
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    h1: category.h1,
    parentId: category.parentId,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    isFeatured: category.isFeatured,
    introText: category.introText,
    bottomContent: category.bottomContent,
    seoTitle: category.seoTitle,
    metaDescription: category.metaDescription,
    focusKeyword: category.focusKeyword,
    secondaryKeywords: category.secondaryKeywords,
    noindex: category.noindex,
    faq: parseFaq(category.faq),
  };
}

function collectDescendantIds(
  all: Array<{ id: string; parentId: string | null }>,
  rootId: string,
): Set<string> {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const category of all) {
      if (category.parentId === current && !ids.has(category.id)) {
        ids.add(category.id);
        stack.push(category.id);
      }
    }
  }
  return ids;
}

async function assertValidParent(
  parentId: string | null,
  selfId?: string,
): Promise<void> {
  if (!parentId) return;
  if (parentId === selfId) {
    throw new UserFacingError("یک دسته نمی‌تواند والد خودش باشد");
  }
  if (!(await findCategoryById(parentId))) {
    throw new UserFacingError("دسته‌ی والد وجود ندارد");
  }
  if (selfId) {
    const descendants = collectDescendantIds(await listAllCategories(), selfId);
    if (descendants.has(parentId)) {
      throw new UserFacingError("والد نمی‌تواند از زیردسته‌های همین دسته باشد");
    }
  }
}

const SLUG_TAKEN = "این نامک (slug) قبلاً استفاده شده است";

async function assertSlugFree(slug: string, excludeId?: string) {
  if (await categorySlugExists(slug, excludeId)) {
    throw new UserFacingError(SLUG_TAKEN);
  }
}

function translateConflict(error: unknown): never {
  if (getUniqueViolationTarget(error)?.includes("slug")) {
    throw new UserFacingError(SLUG_TAKEN);
  }
  throw error;
}

function categoryFields(input: CategoryInput) {
  return {
    name: input.name,
    slug: input.slug,
    h1: input.h1,
    parentId: input.parentId,
    description: input.description,
    sortOrder: input.sortOrder,
    introText: input.introText,
    bottomContent: input.bottomContent,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    focusKeyword: input.focusKeyword,
    secondaryKeywords: input.secondaryKeywords,
    noindex: input.noindex,
    faq: input.faq,
  };
}

export interface CategorySaveResult {
  id: string;
  /** کلمه/عنوان/متای تکراری؛ ذخیره انجام شده و این فقط هشدار است */
  seoWarning: string | null;
}

async function seoWarningFor(id: string, input: CategoryInput) {
  return conflictWarning(
    await getSeoConflicts({
      kind: "category",
      id,
      name: input.name,
      focusKeyword: input.focusKeyword,
      seoTitle: input.seoTitle,
      metaDescription: input.metaDescription,
    }),
  );
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategorySaveResult> {
  await assertValidParent(input.parentId);
  await assertSlugFree(input.slug);
  let id: string;
  try {
    ({ id } = await createCategoryRecord({
      ...categoryFields(input),
      isActive: input.isActive ?? true,
      isFeatured: input.isFeatured ?? false,
    }));
  } catch (error) {
    return translateConflict(error);
  }
  return { id, seoWarning: await seoWarningFor(id, input) };
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CategorySaveResult> {
  const existing = await findCategoryById(id);
  if (!existing) throw new UserFacingError("دسته‌بندی یافت نشد");

  await assertValidParent(input.parentId, id);
  const slugChanged = input.slug !== existing.slug;
  if (slugChanged) await assertSlugFree(input.slug, id);
  try {
    await updateCategoryWithSlugHistory(
      id,
      {
        ...categoryFields(input),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        ...(input.isFeatured === undefined
          ? {}
          : { isFeatured: input.isFeatured }),
      },
      slugChanged ? { from: existing.slug, to: input.slug } : null,
    );
  } catch (error) {
    return translateConflict(error);
  }
  return { id, seoWarning: await seoWarningFor(id, input) };
}

export async function changeCategoryActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  try {
    await updateCategoryRecord(id, { isActive });
  } catch (error) {
    if (isRecordNotFound(error))
      throw new UserFacingError("دسته‌بندی یافت نشد");
    throw error;
  }
}

/**
 * حذف دسته‌ی خالی. آدرس دسته (و نامک‌های قبلی‌اش) با 301 به دسته‌ی والد یا
 * «همه‌ی محصولات» می‌رود تا لینک‌ها و رتبه‌ی گوگل به 404 نرسند.
 */
export async function removeCategory(id: string): Promise<void> {
  const category = await findCategoryById(id);
  if (!category) throw new UserFacingError("دسته‌بندی یافت نشد");
  if (category._count.products > 0) {
    throw new UserFacingError(
      "این دسته محصول دارد؛ ابتدا محصولاتش را به دسته‌ی دیگری منتقل یا بایگانی کنید.",
    );
  }
  if (category._count.children > 0) {
    throw new UserFacingError(
      "این دسته زیردسته دارد؛ ابتدا زیردسته‌ها را حذف یا منتقل کنید.",
    );
  }
  const history = await listSlugHistory("CATEGORY", id);
  await deleteCategoryWithRedirects({
    id,
    fromPaths: [category.slug, ...history.map((h) => h.oldSlug)].map(
      (slug) => `/category/${slug}`,
    ),
    toPath: category.parent ? `/category/${category.parent.slug}` : "/products",
  });
}
