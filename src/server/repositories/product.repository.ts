import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { redirectRemovedEntity } from "./seo.repository";

/** فقط variantهای فعال؛ غیرفعال‌ها در فروشگاه دیده نمی‌شوند. */
const activeVariants = {
  where: { isActive: true },
  orderBy: { sortOrder: "asc" },
} as const;

const orderedImages = { orderBy: { sortOrder: "asc" } } as const;

export function findActiveProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      variants: activeVariants,
      images: orderedImages,
    },
  });
}

export interface ListActiveProductsParams {
  categoryId?: string;
  skip?: number;
  take?: number;
}

export function listActiveProducts({
  categoryId,
  skip = 0,
  take = 24,
}: ListActiveProductsParams = {}) {
  return db.product.findMany({
    where: { isActive: true, ...(categoryId ? { categoryId } : {}) },
    include: { variants: activeVariants, images: orderedImages },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    skip,
    take,
  });
}

// ───────── ادمین ─────────

/** برای ادمین: همه‌ی variantها (فعال و غیرفعال). */
export function findProductById(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: { sortOrder: "asc" } },
      images: orderedImages,
    },
  });
}

export interface AdminProductFilters {
  q?: string;
  categoryId?: string;
  /** «همه» یعنی همه‌ی محصولات بایگانی‌نشده */
  status: "all" | "active" | "inactive" | "archived";
  skip: number;
  take: number;
}

export async function listProductsForAdmin(filters: AdminProductFilters) {
  const where: Prisma.ProductWhereInput = {
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" } }
      : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status === "archived"
      ? { archivedAt: { not: null } }
      : { archivedAt: null }),
    ...(filters.status === "active" || filters.status === "inactive"
      ? { isActive: filters.status === "active" }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        variants: { select: { price: true, isActive: true } },
        images: { select: { alt: true, isPrimary: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: filters.skip,
      take: filters.take,
    }),
    db.product.count({ where }),
  ]);
  return { items, total };
}

export async function productSlugExists(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const found = await db.product.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

/** آیا محصول در سفارشی استفاده شده؟ (برای قفل `unit` و soft delete) */
export async function productHasOrders(productId: string): Promise<boolean> {
  const count = await db.orderItem.count({ where: { productId } });
  return count > 0;
}

/** شناسه‌ی variantهایی که در سفارش استفاده شده‌اند */
export async function findVariantIdsUsedInOrders(
  variantIds: string[],
): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const rows = await db.orderItem.findMany({
    where: { variantId: { in: variantIds } },
    select: { variantId: true },
    distinct: ["variantId"],
  });
  return rows.flatMap((row) => (row.variantId ? [row.variantId] : []));
}

export function setVariantActive(id: string, isActive: boolean) {
  return db.productVariant.update({ where: { id }, data: { isActive } });
}

/** برای بایگانی/حذف دائمی: نامک، وضعیت بایگانی و نامک دسته */
export function findProductArchiveInfo(id: string) {
  return db.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      archivedAt: true,
      archiveRedirectTo: true,
      pricingMode: true,
      category: { select: { slug: true } },
      _count: { select: { variants: { where: { isActive: true } } } },
    },
  });
}

/** نام، نوع و متن اختصاصی شرایط چند محصول (برای نمایش شرایط خدمت در تسویه) */
export function findProductsForTerms(ids: string[]) {
  return db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, kind: true, serviceTerms: true },
    orderBy: { name: "asc" },
  });
}

export function updateProductRecord(
  id: string,
  data: Prisma.ProductUncheckedUpdateInput,
) {
  return db.product.update({ where: { id }, data });
}

/** حذف محصول + تبدیل آدرس‌هایش (فعلی و قبلی) به ریدایرکت 301، در یک تراکنش */
export function deleteProductWithRedirects(params: {
  id: string;
  fromPaths: string[];
  toPath: string;
  note: string;
}) {
  return db.$transaction(async (tx) => {
    await redirectRemovedEntity(tx, {
      entityType: "PRODUCT",
      entityId: params.id,
      fromPaths: params.fromPaths,
      toPath: params.toPath,
      note: params.note,
    });
    await tx.product.delete({ where: { id: params.id } });
  });
}

/** محصولات بایگانی‌نشده (برای انتخاب مقصد ریدایرکت) */
export function listProductLinks() {
  return db.product.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
