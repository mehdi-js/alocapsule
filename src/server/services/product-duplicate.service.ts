import { logger } from "@/lib/logger";
import {
  buildVariantTitle,
  type OptionDef,
  parseOptionKey,
} from "@/lib/product-options";
import { getStorage, type LocalStorageDriver } from "@/lib/storage";
import { UserFacingError } from "@/server/errors";
import {
  findProductById,
  productSlugExists,
} from "@/server/repositories/product.repository";
import {
  createProductWithStructure,
  type StructurePlan,
} from "@/server/repositories/product-structure.repository";

import {
  addProductImage,
  changeImageAlt,
  makeImagePrimary,
} from "./product-image.service";

async function freeCopySlug(slug: string): Promise<string> {
  for (let attempt = 1; attempt < 50; attempt++) {
    const candidate =
      attempt === 1 ? `${slug}-copy` : `${slug}-copy-${attempt}`;
    if (!(await productSlugExists(candidate))) return candidate;
  }
  throw new UserFacingError("نامک آزاد برای کپی پیدا نشد");
}

async function readStoredImage(url: string): Promise<Buffer | null> {
  const storage = getStorage();
  const key = storage.keyFromUrl(url);
  if (storage.name === "local" && key) {
    return (storage as LocalStorageDriver).read(key);
  }
  try {
    const response = await fetch(url);
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * «کپی محصول» (SEO.md §۴.۴): گزینه‌ها، ترکیب‌ها، قیمت‌ها، تصاویر، شرایط خدمت و
 * فیلدهای سئو؛ نام و نامک با پسوند «(کپی)» / `-copy`، **غیرفعال** و
 * `focusKeyword` خالی (تا هشدار تکراری ندهد). محصول متناظر کپی نمی‌شود.
 * تصاویر دوباره پردازش و با فایل جدید ذخیره می‌شوند (حذف تصویر کپی، فایل
 * اصلی را پاک نمی‌کند).
 */
export async function duplicateProduct(
  id: string,
): Promise<{ id: string; copiedImages: number }> {
  const source = await findProductById(id);
  if (!source) throw new UserFacingError("محصول یافت نشد");

  const defs: OptionDef[] = source.options.map((option) => ({
    code: option.code,
    name: option.name,
    values: option.values.map((value) => ({
      code: value.code,
      label: value.label,
      isActive: value.isActive,
    })),
  }));
  const plan: StructurePlan = {
    options: source.options.map((option, optionIndex) => ({
      name: option.name,
      code: option.code,
      sortOrder: optionIndex,
      values: option.values.map((value, valueIndex) => ({
        label: value.label,
        code: value.code,
        sortOrder: valueIndex,
        isActive: value.isActive,
      })),
    })),
    variants: source.variants.map((variant, index) => {
      const selection = parseOptionKey(variant.optionKey);
      return {
        key: variant.optionKey,
        selection,
        title:
          variant.title ??
          (defs.length > 0 ? buildVariantTitle(defs, selection) : null),
        sku: null,
        price: variant.price,
        comparePrice: variant.comparePrice,
        shippingWeightGrams: variant.shippingWeightGrams,
        isActive: variant.isActive,
        sortOrder: index,
      };
    }),
  };

  const created = await createProductWithStructure(
    {
      name: `${source.name} (کپی)`,
      slug: await freeCopySlug(source.slug),
      categoryId: source.categoryId,
      unit: source.unit,
      kind: source.kind,
      pricingMode: source.pricingMode,
      serviceTerms: source.serviceTerms,
      shortDescription: source.shortDescription,
      description: source.description,
      sortOrder: source.sortOrder,
      isActive: false,
      seoTitle: source.seoTitle,
      metaDescription: source.metaDescription,
      // کلمه‌ی کانونی کپی نمی‌شود تا هشدار «کلمه‌ی تکراری» ندهد
      focusKeyword: null,
      secondaryKeywords: source.secondaryKeywords,
      noindex: source.noindex,
      faq: source.faq ?? undefined,
    },
    plan,
    null,
  );

  let copiedImages = 0;
  const storage = getStorage();
  for (const image of source.images) {
    const bytes = await readStoredImage(image.url);
    if (!bytes) continue;
    try {
      const saved = await addProductImage(created.id, bytes, storage);
      await changeImageAlt(saved.id, image.alt);
      if (image.isPrimary) await makeImagePrimary(saved.id);
      copiedImages++;
    } catch (error) {
      logger.error("product_duplicate_image_failed", error, { productId: id });
    }
  }
  return { id: created.id, copiedImages };
}
