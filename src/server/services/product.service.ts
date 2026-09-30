import {} from "@/lib/product-options";
import { sanitizePlainText } from "@/lib/sanitize-text";
import {
  canActivateProduct,
  type ProductInput,
} from "@/lib/validation/product";
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
  findVariantForActivation,
  findVariantIdsUsedInOrders,
  productHasOrders,
  productSlugExists,
  setVariantActive,
  updateProductRecord,
} from "@/server/repositories/product.repository";
import { listProductImages } from "@/server/repositories/product-image.repository";
import {
  createProductWithStructure,
  type StructurePlan,
  updateProductWithStructure,
} from "@/server/repositories/product-structure.repository";
import { listSlugHistory } from "@/server/repositories/seo.repository";

import { deleteImageFilesByUrl } from "./product-image.service";
import {
  assertOptionCodesUnlocked,
  assertPairable,
  prepareStructure,
} from "./product-structure.service";
import { conflictWarning, getSeoConflicts } from "./seo-conflicts.service";

/**
 * ساخت/ویرایش/بایگانی محصول در پنل ادمین؛ خواندن در
 * `product-query.service.ts`. قواعد سئو: SEO.md §۴.۳ و §۱۰.۱.
 */

const SLUG_TAKEN = "این نامک (slug) قبلاً استفاده شده است";

export interface ProductSaveResult {
  id: string;
  /** کلمه/عنوان/متای تکراری؛ ذخیره انجام شده و این فقط هشدار است */
  seoWarning: string | null;
  /** تعداد ترکیب‌هایی که به‌خاطر «استعلامی» شدن محصول غیرفعال شدند (نه حذف) */
  deactivatedVariants: number;
}

export const CANNOT_ACTIVATE_MESSAGE =
  "محصول قیمت‌دار برای فعال شدن حداقل یک ترکیب فعال لازم دارد.";
export const VARIANT_NO_PRICE_MESSAGE = "ترکیب بدون قیمت نمی‌تواند فعال شود.";
async function assertSlugFree(slug: string, excludeId?: string) {
  if (await productSlugExists(slug, excludeId)) {
    throw new UserFacingError(SLUG_TAKEN);
  }
}

function translateConflict(error: unknown): never {
  const target = getUniqueViolationTarget(error);
  if (target?.includes("slug")) throw new UserFacingError(SLUG_TAKEN);
  if (target?.includes("optionKey")) {
    throw new UserFacingError("دو ترکیب با گزینه‌های یکسان مجاز نیست");
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
    kind: input.kind,
    pricingMode: input.pricingMode,
    // برای کالای فیزیکی ذخیره می‌شود ولی نادیده گرفته می‌شود (`resolveServiceTerms`)
    serviceTerms: sanitizePlainText(input.serviceTerms),
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
  await assertPairable(null, input.pairedProductId);
  // استعلامی هرگز گزینه/ترکیب ندارد؛ ورودی نادیده گرفته می‌شود
  const plan: StructurePlan =
    input.pricingMode === "INQUIRY"
      ? { options: [], variants: [] }
      : prepareStructure(input, null);
  const activatable = canActivateProduct({
    pricingMode: input.pricingMode,
    activeVariantCount: plan.variants.filter((variant) => variant.isActive)
      .length,
  });
  if (input.isActive === true && !activatable) {
    throw new UserFacingError(CANNOT_ACTIVATE_MESSAGE);
  }

  let id: string;
  try {
    ({ id } = await createProductWithStructure(
      { ...productFields(input), isActive: input.isActive ?? activatable },
      plan,
      input.pairedProductId,
    ));
  } catch (error) {
    return translateConflict(error);
  }
  return {
    id,
    seoWarning: await seoWarningFor(id, input),
    deactivatedVariants: 0,
  };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductSaveResult> {
  const existing = await findProductById(id);
  if (!existing) throw new UserFacingError("محصول یافت نشد");

  await assertCategoryExists(input.categoryId);
  await assertPairable(id, input.pairedProductId);
  const hasOrders = await productHasOrders(id);
  if (input.unit !== existing.unit && hasOrders) {
    throw new UserFacingError(
      "پس از ثبت اولین سفارش، تغییر واحد فروش (گرمی/عددی) ممکن نیست",
    );
  }

  const inquiry = input.pricingMode === "INQUIRY";
  // استعلامی: ساختار دست نمی‌خورد جز غیرفعال شدن ترکیب‌ها (نه حذف)
  let plan: StructurePlan | undefined;
  if (!inquiry) {
    if (hasOrders) assertOptionCodesUnlocked(existing, input);
    plan = prepareStructure(input, existing);
    const plannedIds = new Set(
      plan.variants.flatMap((v) => (v.id ? [v.id] : [])),
    );
    const removed = existing.variants
      .filter((variant) => !plannedIds.has(variant.id))
      .map((variant) => variant.id);
    const usedInOrders = await findVariantIdsUsedInOrders(removed);
    if (usedInOrders.length > 0) {
      throw new UserFacingError(
        "برخی از ترکیب‌های حذف‌شده در سفارش‌ها استفاده شده‌اند؛ به‌جای حذف، آن‌ها را غیرفعال کنید.",
      );
    }
  }

  const slugChanged = input.slug !== existing.slug;
  if (slugChanged) await assertSlugFree(input.slug, id);
  let deactivatedVariants = 0;
  try {
    ({ deactivatedVariants } = await updateProductWithStructure(
      id,
      productFields(input),
      {
        plan,
        deactivateVariants: inquiry,
        slugChange: slugChanged
          ? { from: existing.slug, to: input.slug }
          : null,
        pairedProductId: input.pairedProductId,
      },
    ));
  } catch (error) {
    return translateConflict(error);
  }
  return {
    id,
    seoWarning: await seoWarningFor(id, input),
    deactivatedVariants,
  };
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
  if (
    isActive &&
    !canActivateProduct({
      pricingMode: product.pricingMode,
      activeVariantCount: product._count.variants,
    })
  ) {
    throw new UserFacingError(CANNOT_ACTIVATE_MESSAGE);
  }
  await updateProductRecord(id, { isActive });
}

export async function changeVariantActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  if (isActive) {
    const variant = await findVariantForActivation(id);
    if (!variant) throw new UserFacingError("ترکیب یافت نشد");
    // ترکیب بدون قیمت یا دارای مقدار غیرفعال نمی‌تواند فعال شود
    if (variant.price <= 0) throw new UserFacingError(VARIANT_NO_PRICE_MESSAGE);
    if (variant.optionValues.some((link) => !link.optionValue.isActive)) {
      throw new UserFacingError(
        "این ترکیب مقدار غیرفعالِ گزینه دارد؛ اول آن مقدار را فعال کنید.",
      );
    }
  }
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
