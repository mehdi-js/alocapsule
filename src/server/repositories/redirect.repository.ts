import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export function listActiveRedirectRows() {
  return db.redirect.findMany({
    where: { isActive: true },
    select: { fromPath: true, toPath: true, statusCode: true },
  });
}

export function listRedirectRows(params: {
  q: string;
  skip: number;
  take: number;
}) {
  const where: Prisma.RedirectWhereInput = params.q
    ? {
        OR: [
          { fromPath: { contains: params.q, mode: "insensitive" } },
          { toPath: { contains: params.q, mode: "insensitive" } },
          { note: { contains: params.q, mode: "insensitive" } },
        ],
      }
    : {};
  return Promise.all([
    db.redirect.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: params.skip,
      take: params.take,
    }),
    db.redirect.count({ where }),
  ]);
}

export function findRedirectById(id: string) {
  return db.redirect.findUnique({ where: { id } });
}

export function findRedirectByFrom(fromPath: string) {
  return db.redirect.findUnique({ where: { fromPath } });
}

export function createRedirectRow(data: Prisma.RedirectCreateInput) {
  return db.redirect.create({ data });
}

export function updateRedirectRow(
  id: string,
  data: Prisma.RedirectUpdateInput,
) {
  return db.redirect.update({ where: { id }, data });
}

export function deleteRedirectRow(id: string) {
  return db.redirect.delete({ where: { id } });
}

export function upsertRedirectRows(
  rows: {
    fromPath: string;
    toPath: string;
    statusCode: number;
    note: string;
  }[],
) {
  return db.$transaction(
    rows.map((row) =>
      db.redirect.upsert({
        where: { fromPath: row.fromPath },
        create: row,
        update: {
          toPath: row.toPath,
          statusCode: row.statusCode,
          note: row.note,
          isActive: true,
        },
      }),
    ),
  );
}

export function recordRedirectHit(fromPath: string) {
  return db.redirect.updateMany({
    where: { fromPath },
    data: { hits: { increment: 1 }, lastHitAt: new Date() },
  });
}

// ───────── لاگ ۴۰۴ ─────────

export function upsertNotFound(path: string, referrer: string | null) {
  const now = new Date();
  return db.notFoundLog.upsert({
    where: { path },
    create: { path, lastReferrer: referrer },
    update: {
      hits: { increment: 1 },
      lastSeenAt: now,
      ...(referrer ? { lastReferrer: referrer } : {}),
    },
  });
}

export function listNotFoundRows(params: { skip: number; take: number }) {
  return Promise.all([
    db.notFoundLog.findMany({
      orderBy: [{ hits: "desc" }, { lastSeenAt: "desc" }],
      skip: params.skip,
      take: params.take,
    }),
    db.notFoundLog.count(),
  ]);
}

export function deleteNotFoundRows(ids: string[] | "all") {
  return ids === "all"
    ? db.notFoundLog.deleteMany()
    : db.notFoundLog.deleteMany({ where: { id: { in: ids } } });
}

/** مسیرهای ۴۰۴ که ریدایرکت پیدا کرده‌اند از لاگ پاک می‌شوند */
export function deleteNotFoundByPath(path: string) {
  return db.notFoundLog.deleteMany({ where: { path } });
}
