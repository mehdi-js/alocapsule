import { logger } from "@/lib/logger";
import {
  checkRedirect,
  isJunkPath,
  legacyRule,
  normalizeRedirectPath,
  normalizeRedirectTarget,
  parseRedirectCsv,
  type RedirectRule,
  type RedirectStatus,
  resolveRedirect,
} from "@/lib/seo/redirects";
import type { RedirectInput } from "@/lib/validation/content";
import { getUniqueViolationTarget, UserFacingError } from "@/server/errors";
import {
  createRedirectRow,
  deleteNotFoundByPath,
  deleteRedirectRow,
  findRedirectById,
  listActiveRedirectRows,
  recordRedirectHit,
  updateRedirectRow,
  upsertNotFound,
  upsertRedirectRows,
} from "@/server/repositories/redirect.repository";

/**
 * ریدایرکت‌ها و لاگ ۴۰۴ (SEO.md §۱۱ و §۱۰.۳–۱۰.۴). جدول ریدایرکت در حافظه
 * کش می‌شود (TTL کوتاه؛ هر تغییر از پنل کش را پاک می‌کند) تا middleware برای
 * هر درخواست به دیتابیس نرود.
 */

const TTL_MS = 60_000;
let cache: { rules: Map<string, RedirectRule>; expiresAt: number } | null =
  null;

export function clearRedirectCache(): void {
  cache = null;
}

async function loadRules(): Promise<Map<string, RedirectRule>> {
  const rows = await listActiveRedirectRows();
  return new Map(
    rows.map((row) => [
      row.fromPath,
      { toPath: row.toPath, statusCode: row.statusCode as RedirectStatus },
    ]),
  );
}

export async function getRedirectRules(now = Date.now()) {
  if (cache && cache.expiresAt > now) return cache.rules;
  try {
    const rules = await loadRules();
    cache = { rules, expiresAt: now + TTL_MS };
    return rules;
  } catch (error) {
    logger.error("redirect_rules_load_failed", error);
    return cache?.rules ?? new Map<string, RedirectRule>();
  }
}

export type RequestRedirect =
  { kind: "redirect"; to: string } | { kind: "gone" } | null;

/**
 * تصمیم middleware برای یک مسیر: اول جدول ریدایرکت (با زنجیره تا مقصد
 * نهایی)، بعد قواعد الگویی وردپرس. مسیرهایی که قاعده‌ی الگویی «نرم» دارند
 * (مثل /product/x ⇒ /products) برای نگاشت دستی در لاگ ۴۰۴ هم ثبت می‌شوند.
 */
export async function matchRedirect(
  pathname: string,
  search: string,
  referrer: string | null,
): Promise<RequestRedirect> {
  const path = normalizeRedirectPath(pathname);
  const rules = await getRedirectRules();
  const resolved = resolveRedirect(rules, path);
  if (resolved) {
    void recordRedirectHit(path).catch(() => undefined);
    if (resolved.kind === "gone") return resolved;
    return resolved.to === path ? null : resolved;
  }
  const legacy = legacyRule(path, search);
  if (!legacy) return null;
  if (legacy.kind === "redirect" && legacy.log) {
    void recordNotFound(pathname, referrer);
  }
  if (legacy.kind === "redirect" && legacy.to === path && !search) return null;
  return legacy;
}

/** ثبت ۴۰۴ (بی‌خطا؛ مسیرهای اسکنرها ثبت نمی‌شوند) */
export async function recordNotFound(
  pathname: string,
  referrer: string | null,
): Promise<void> {
  const path = normalizeRedirectPath(pathname).slice(0, 500);
  if (isJunkPath(path)) return;
  try {
    await upsertNotFound(path, referrer?.slice(0, 500) || null);
  } catch (error) {
    logger.error("not_found_log_failed", error);
  }
}

// ───────── پنل ادمین ─────────

export interface RedirectSaveResult {
  id: string;
  /** مقصد خودش ریدایرکت دارد ⇒ مقصد نهایی پیشنهادی */
  finalTarget: string | null;
}

function prepare(input: RedirectInput) {
  const fromPath = normalizeRedirectPath(input.fromPath);
  if (fromPath === "/") {
    throw new UserFacingError("صفحه‌ی اصلی نمی‌تواند مبدأ ریدایرکت باشد.");
  }
  const toPath =
    input.statusCode === 410 ? "" : normalizeRedirectTarget(input.toPath);
  if (toPath === null) {
    throw new UserFacingError(
      "مقصد باید مسیر داخلی (مثل /products) یا آدرس کامل https باشد.",
    );
  }
  return { fromPath, toPath };
}

function translateConflict(error: unknown): never {
  if (getUniqueViolationTarget(error)?.includes("fromPath")) {
    throw new UserFacingError("برای این آدرس مبدأ قبلاً ریدایرکت ثبت شده است.");
  }
  throw error;
}

export async function saveRedirect(
  input: RedirectInput,
  id?: string,
): Promise<RedirectSaveResult> {
  const { fromPath, toPath } = prepare(input);
  const existing = await loadRules();
  if (id) {
    const current = await findRedirectById(id);
    if (!current) throw new UserFacingError("ریدایرکت یافت نشد.");
    existing.delete(current.fromPath);
  }
  const check = checkRedirect(existing, fromPath, {
    toPath,
    statusCode: input.statusCode,
  });
  if (!check.ok) throw new UserFacingError(check.message);

  const data = {
    fromPath,
    toPath,
    statusCode: input.statusCode,
    note: input.note,
    isActive: input.isActive,
  };
  let savedId: string;
  try {
    savedId = id
      ? (await updateRedirectRow(id, data)).id
      : (await createRedirectRow(data)).id;
  } catch (error) {
    return translateConflict(error);
  }
  await deleteNotFoundByPath(fromPath);
  clearRedirectCache();
  return { id: savedId, finalTarget: check.finalTarget };
}

export async function removeRedirect(id: string): Promise<void> {
  if (!(await findRedirectById(id))) {
    throw new UserFacingError("ریدایرکت یافت نشد.");
  }
  await deleteRedirectRow(id);
  clearRedirectCache();
}

export async function toggleRedirect(id: string, isActive: boolean) {
  await updateRedirectRow(id, { isActive });
  clearRedirectCache();
}

export interface ImportResult {
  saved: number;
  errors: { line: number; message: string }[];
}

/**
 * ورود گروهی CSV (`from,to,status`). هر سطر مثل فرم اعتبارسنجی می‌شود
 * (حلقه ⇒ خطای همان سطر)؛ سطرهای سالم در یک تراکنش ذخیره می‌شوند و ردیف
 * موجود با همان مبدأ به‌روز می‌شود.
 */
export async function importRedirectCsv(text: string): Promise<ImportResult> {
  const { rows, errors } = parseRedirectCsv(text);
  if (rows.length > 5000) {
    throw new UserFacingError("حداکثر ۵۰۰۰ سطر در هر بار ورود.");
  }
  const rules = await loadRules();
  const accepted: {
    fromPath: string;
    toPath: string;
    statusCode: number;
    note: string;
  }[] = [];
  for (const row of rows) {
    try {
      const { fromPath, toPath } = prepare({
        fromPath: row.from,
        toPath: row.to,
        statusCode: row.status,
        note: null,
        isActive: true,
      });
      const rule = { toPath, statusCode: row.status };
      const check = checkRedirect(rules, fromPath, rule);
      if (!check.ok) throw new UserFacingError(check.message);
      rules.set(fromPath, rule);
      accepted.push({
        fromPath,
        toPath,
        statusCode: row.status,
        note: "ورود CSV",
      });
    } catch (error) {
      errors.push({
        line: row.line,
        message:
          error instanceof UserFacingError ? error.message : "سطر نامعتبر",
      });
    }
  }
  if (accepted.length > 0) {
    await upsertRedirectRows(accepted);
    for (const row of accepted) await deleteNotFoundByPath(row.fromPath);
    clearRedirectCache();
  }
  return {
    saved: accepted.length,
    errors: errors.sort((a, b) => a.line - b.line),
  };
}
