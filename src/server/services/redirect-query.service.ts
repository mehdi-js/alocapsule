import {
  deleteNotFoundRows,
  listNotFoundRows,
  listRedirectRows,
} from "@/server/repositories/redirect.repository";

/** فهرست‌های پنل ادمین: ریدایرکت‌ها و لاگ ۴۰۴ */

export async function clearNotFound(ids: string[] | "all"): Promise<void> {
  await deleteNotFoundRows(ids);
}

export const ADMIN_REDIRECTS_PAGE_SIZE = 50;

export interface RedirectListItem {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  hits: number;
  lastHitAt: Date | null;
  note: string | null;
}

export async function listRedirects(params: { q: string; page: number }) {
  const [items, total] = await listRedirectRows({
    q: params.q,
    skip: (params.page - 1) * ADMIN_REDIRECTS_PAGE_SIZE,
    take: ADMIN_REDIRECTS_PAGE_SIZE,
  });
  return {
    items: items.map((row): RedirectListItem => ({
      id: row.id,
      fromPath: row.fromPath,
      toPath: row.toPath,
      statusCode: row.statusCode,
      isActive: row.isActive,
      hits: row.hits,
      lastHitAt: row.lastHitAt,
      note: row.note,
    })),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_REDIRECTS_PAGE_SIZE)),
  };
}

export async function listNotFound(page: number) {
  const [items, total] = await listNotFoundRows({
    skip: (page - 1) * ADMIN_REDIRECTS_PAGE_SIZE,
    take: ADMIN_REDIRECTS_PAGE_SIZE,
  });
  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_REDIRECTS_PAGE_SIZE)),
  };
}
