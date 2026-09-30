import { sanitizePlainText } from "@/lib/sanitize-text";
import type { ProductInput } from "@/lib/validation/product";
import {
  getUniqueViolationTarget,
  isRecordNotFound,
  UserFacingError,
} from "@/server/errors";
import { findCategoryById } from "@/server/repositories/category.repository";
import {
  deleteProductWithRedirects,
  findProductArchiveInfo,
  findProductById,
  findVariantIdsUsedInOrders,
  productHasOrders,
  productSlugExists,
  setVariantActive,
  updateProductRecord,
} from "@/server/repositories/product.repository";
import { listProductImages } from "@/server/repositories/product-image.repository";
import {
  createProductWithVariants,
  updateProductWithVariants,
} from "@/server/repositories/product-write.repository";
import { listSlugHistory } from "@/server/repositories/seo.repository";

import { deleteImageFilesByUrl } from "./product-image.service";
import { conflictWarning, getSeoConflicts } from "./seo-conflicts.service";
import { planVariantSync } from "./variant-sync";

/**
 * ساخت/ویرایش/بایگانی محصول در پنل ادمین؛ خواندن در
 * `product-query.service.ts`. قواعد سئو: SEO.md §۴.۳ و §۱۰.۱.
 */

const SLUG_TAKEN = "این نامک (slug) قبلاً استفاده شده است";

export interface ProductSaveResult {
  id: string;
  /** کلمه/عنوان/متای تکراری؛ ذخیره انجام شده و این فقط هشدار است */
  seoWarning: string | null;
}

async function assertSlugFree(slug: string, excludeId?: string) {
  if (await productSlugExists(slug, excludeId)) {
    throw new UserFacingError(SLUG_TAKEN);
  }
}

function translateConflict(error: unknown): never {
  const target = getUniqueViolationTarget(error);
  if (target?.includes("slug")) throw new UserFacingError(SLUG_TAKEN);
  if (target?.includes("unitValue")) {
    throw new UserFacingError("دو متغیر با مقدار واحد یکسان مجاز نیست");
  }
  throw error;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  if (!(await findCategoryById(categoryId))) {
    throw new UserFacingError("دسته‌بندی انتخاب‌شده وجود ندارد");
  }
}

function productFields(input: ProductInput) {
  return {
    name: input.name,
    slug: input.slug,
    categoryId: input.categoryId,
    unit: input.unit,
    shortDescription: input.shortDescription,
    description: sanitizePlainText(input.description),
    sortOrder: input.sortOrder,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    focusKeyword: input.focusKeyword,
    secondaryKeywords: input.secondaryKeywords,
    noindex: input.noindex,
    canonicalUrl: input.canonicalUrl,
    faq: input.faq,
  };
}

async function seoWarningFor(id: string, input: ProductInput) {
  return conflictWarning(
    await getSeoConflicts({
      kind: "product",
      id,
      name: input.name,
      focusKeyword: input.focusKeyword,
      seoTitle: input.seoTitle,
      metaDescription: input.metaDescription,
    }),
  );
}

export async function createProduct(
  input: ProductInput,
): Promise<ProductSaveResult> {
  await assertCategoryExists(input.categoryId);
  await assertSlugFree(input.slug);
  const { creates } = planVariantSync([], input.variants);

  let id: string;
  try {
    ({ id } = await createProductWithVariants(
      { ...productFields(input), isActive: input.isActive ?? true },
      creates,
    ));
  } catch (error) {
    return translateConflict(error);
  }
  return { id, seoWarning: await seoWarningFor(id, input) };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductSaveResult> {
  const existing = await findProductById(id);
  if (!existing) throw new UserFacingError("محصول یافت نشد");

  await assertCategoryExists(input.categoryId);
  if (input.unit !== existing.unit && (await productHasOrders(id))) {
    throw new UserFacingError(
      "پس از ثبت اولین سفارش، تغییر واحد فروش (گرمی/عددی) ممکن نیست",
    );
  }

  const plan = planVariantSync(existing.variants, input.variants);
  const usedInOrders = await findVariantIdsUsedInOrders(plan.deleteIds);
  if (usedInOrders.length > 0) {
    throw new UserFacingError(
      "برخی از متغیرهای حذف‌شده در سفارش‌ها استفاده شده‌اند؛ به‌جای حذف، آن‌ها را غیرفعال کنید.",
    );
  }

  const slugChanged = input.slug !== existing.slug;
  if (slugChanged) await assertSlugFree(input.slug, id);
  try {
    await updateProductWithVariants(
      id,
      productFields(input),
      plan,
      slugChanged ? { from: existing.slug, to: input.slug } : null,
    );
  } catch (error) {
    return translateConflict(error);
  }
  return { id, seoWarning: await seoWarningFor(id, input) };
}

async function requireProduct(id: string) {
  const product = await findProductArchiveInfo(id);
  if (!product) throw new UserFacingError("محصول یافت نشد");
  return product;
}

/** تنها راه «برداشتن موقت از سایت»: یک کلید، بدون محاسبه. */
export async function changeProductActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const product = await requireProduct(id);
  if (isActive && product.archivedAt) {
    throw new UserFacingError(
      "این محصول بایگانی شده است؛ اول آن را از بایگانی خارج کنید.",
    );
  }
  await updateProductRecord(id, { isActive });
}

export async function changeVariantActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  try {
    await setVariantActive(id, isActive);
  } catch (error) {
    if (isRecordNotFound(error)) throw new UserFacingError("متغیر یافت نشد");
    throw error;
  }
}

/** مقصد پیش‌فرض ریدایرکت بایگانی: دسته‌ی محصول */
export function defaultArchiveTarget(categorySlug: string): string {
  return `/category/${categorySlug}`;
}

/**
 * «حذف» محصول = بایگانی (SEO.md §۴.۳): از لیست‌ها و فروش خارج می‌شود و
 * آدرسش با 301 به مقصد انتخابی ادمین (پیش‌فرض دسته) می‌رود؛ سفارش‌های قبلی
 * دست نمی‌خورند و قابل بازگردانی است.
 */
export async function archiveProduct(
  id: string,
  redirectTo: string | null,
): Promise<void> {
  const product = await requireProduct(id);
  const target = redirectTo || defaultArchiveTarget(product.category.slug);
  if (target === `/products/${product.slug}`) {
    throw new UserFacingError("مقصد ریدایرکت نمی‌تواند خود همین محصول باشد.");
  }
  await updateProductRecord(id, {
    archivedAt: product.archivedAt ?? new Date(),
    archiveRedirectTo: target,
    isActive: false,
  });
}

/** خروج از بایگانی؛ محصول غیرفعال می‌ماند تا ادمین دوباره فعالش کند */
export async function restoreProduct(id: string): Promise<void> {
  await requireProduct(id);
  await updateProductRecord(id, { archivedAt: null, archiveRedirectTo: null });
}

/**
 * حذف دائمی فقط برای محصول بایگانی‌شده‌ای که سفارش ندارد (مثلاً محصول
 * آزمایشی). آدرس محصول و نامک‌های قبلی‌اش به ریدایرکت 301 ثابت به همان
 * مقصد بایگانی تبدیل می‌شوند تا هیچ لینکی 404 نشود.
 */
export async function deleteProductPermanently(id: string): Promise<void> {
  const product = await requireProduct(id);
  if (!product.archivedAt || !product.archiveRedirectTo) {
    throw new UserFacingError("فقط محصول بایگانی‌شده حذف دائمی می‌شود.");
  }
  if (await productHasOrders(id)) {
    throw new UserFacingError(
      "این محصول در سفارش‌ها استفاده شده و حذف دائمی نمی‌شود؛ در بایگانی می‌ماند.",
    );
  }
  const [images, history] = await Promise.all([
    listProductImages(id),
    listSlugHistory("PRODUCT", id),
  ]);
  await deleteProductWithRedirects({
    id,
    fromPaths: [product.slug, ...history.map((h) => h.oldSlug)].map(
      (slug) => `/products/${slug}`,
    ),
    toPath: product.archiveRedirectTo,
    note: "حذف دائمی محصول بایگانی‌شده",
  });
  // ردیف‌های تصویر با حذف محصول cascade می‌شوند؛ فایل‌هایشان جدا پاک می‌شود.
  await deleteImageFilesByUrl(images.map((image) => image.url));
}
