import type { Prisma } from "@prisma/client";
import { cache } from "react";

import { type OpeningHours, parseOpeningHours } from "@/lib/branch-hours";
import { isBuildWithoutDb } from "@/lib/build-phase";
import type { BranchInput } from "@/lib/validation/content";
import { getUniqueViolationTarget, UserFacingError } from "@/server/errors";
import { findSlugHistoryTarget } from "@/server/repositories/catalog-page.repository";
import {
  createBranchRow,
  deleteWithRedirects,
  findBranchById,
  findBranchBySlug,
  listBranchRows,
  updateWithSlugHistory,
} from "@/server/repositories/content.repository";
import { listSlugHistory } from "@/server/repositories/seo.repository";

import type { PageLookup } from "./catalog-page.service";
import { clearRedirectCache } from "./redirect.service";

/**
 * شعب (SEO.md §۶.۴ و فاز S4): صفحه‌ی `/branches/{slug}` با schema `LocalBusiness`.
 * نام، آدرس و تلفن هر شعبه فقط همین‌جا ثبت می‌شود (یک منبع برای صفحات،
 * درباره ما و schema).
 */

export interface BranchDto {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string | null;
  address: string;
  phone: string;
  openingHours: OpeningHours;
  latitude: number | null;
  longitude: number | null;
  mapLinks: {
    neshan: string | null;
    balad: string | null;
    google: string | null;
  };
  imageUrl: string | null;
  description: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
}

type BranchRow = NonNullable<Awaited<ReturnType<typeof findBranchById>>>;

function link(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\//i.test(value) ? value : null;
}

function toDto(row: BranchRow): BranchDto {
  const links =
    row.mapLinks &&
    typeof row.mapLinks === "object" &&
    !Array.isArray(row.mapLinks)
      ? (row.mapLinks as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    district: row.district,
    address: row.address,
    phone: row.phone,
    openingHours: parseOpeningHours(row.openingHours),
    latitude: row.latitude,
    longitude: row.longitude,
    mapLinks: {
      neshan: link(links.neshan),
      balad: link(links.balad),
      google: link(links.google),
    },
    imageUrl: row.imageUrl,
    description: row.description,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  };
}

export async function listBranches(): Promise<BranchDto[]> {
  return (await listBranchRows()).map(toDto);
}

export const listActiveBranches = cache(async (): Promise<BranchDto[]> => {
  if (isBuildWithoutDb()) return [];
  return (await listBranchRows(true)).map(toDto);
});

export async function getBranch(id: string): Promise<BranchDto | null> {
  const row = await findBranchById(id);
  return row ? toDto(row) : null;
}

export const getBranchPage = cache(
  async (slug: string): Promise<PageLookup<BranchDto>> => {
    const row = await findBranchBySlug(slug);
    if (row?.isActive) return { kind: "found", data: toDto(row) };
    if (row) return { kind: "missing" };
    const id = await findSlugHistoryTarget("BRANCH", slug);
    const target = id ? await findBranchById(id) : null;
    return target?.isActive
      ? { kind: "redirect", to: `/branches/${target.slug}` }
      : { kind: "missing" };
  },
);

function branchFields(input: BranchInput) {
  return {
    name: input.name,
    slug: input.slug,
    city: input.city,
    district: input.district,
    address: input.address,
    phone: input.phone,
    openingHours: input.openingHours as unknown as Prisma.InputJsonValue,
    latitude: input.latitude,
    longitude: input.longitude,
    mapLinks: input.mapLinks as unknown as Prisma.InputJsonValue,
    description: input.description,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

function translateConflict(error: unknown): never {
  if (getUniqueViolationTarget(error)?.includes("slug")) {
    throw new UserFacingError(
      "این نامک قبلاً برای شعبه‌ی دیگری استفاده شده است.",
    );
  }
  throw error;
}

export async function createBranch(
  input: BranchInput,
): Promise<{ id: string }> {
  try {
    const { id } = await createBranchRow(branchFields(input));
    return { id };
  } catch (error) {
    return translateConflict(error);
  }
}

export async function updateBranch(
  id: string,
  input: BranchInput,
): Promise<{ id: string }> {
  const existing = await findBranchById(id);
  if (!existing) throw new UserFacingError("شعبه یافت نشد.");
  const slugChanged = input.slug !== existing.slug;
  try {
    await updateWithSlugHistory(
      "branch",
      id,
      branchFields(input),
      slugChanged ? { from: existing.slug, to: input.slug } : null,
    );
  } catch (error) {
    return translateConflict(error);
  }
  return { id };
}

/** حذف شعبه ⇒ آدرس صفحه‌اش به فهرست شعب ریدایرکت می‌شود */
export async function deleteBranch(id: string): Promise<void> {
  const existing = await findBranchById(id);
  if (!existing) throw new UserFacingError("شعبه یافت نشد.");
  const history = await listSlugHistory("BRANCH", id);
  await deleteWithRedirects("branch", {
    id,
    fromPaths: [existing.slug, ...history.map((h) => h.oldSlug)].map(
      (slug) => `/branches/${slug}`,
    ),
    toPath: "/branches",
    note: "حذف شعبه",
  });
  clearRedirectCache();
}
