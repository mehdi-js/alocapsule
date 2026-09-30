import { addTehranDays, parseJalaliDateInput } from "@/lib/date";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/lib/order-status";
import { toLatinDigits } from "@/lib/utils";

/** فیلترهای جدول سفارش‌های ادمین (صفحه و خروجی CSV از یک منبع) */

export const ORDER_PAGE_SIZE = 50;

export interface OrderFilters {
  status: OrderStatus | null;
  /** ابتدای روز شروع (تهران) */
  from: Date | null;
  /** انحصاری: ابتدای روز بعد از روز پایان */
  to: Date | null;
  /** شماره‌ی سفارش یا موبایل مشتری */
  q: string;
  page: number;
  /** مقادیر خام برای پر کردن دوباره‌ی فرم و ساخت لینک */
  raw: { status: string; from: string; to: string; q: string };
}

export type OrderFiltersResult = {
  filters: OrderFilters;
  error: string | null;
};

const STATUSES = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];

export function parseOrderFilters(params: {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: string;
}): OrderFiltersResult {
  const raw = {
    status: params.status ?? "",
    from: (params.from ?? "").trim(),
    to: (params.to ?? "").trim(),
    q: (params.q ?? "").trim().slice(0, 40),
  };
  const status = STATUSES.includes(raw.status as OrderStatus)
    ? (raw.status as OrderStatus)
    : null;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let from: Date | null = null;
  let to: Date | null = null;
  let error: string | null = null;
  try {
    from = parseJalaliDateInput(raw.from);
    const end = parseJalaliDateInput(raw.to);
    to = end ? addTehranDays(end, 1) : null;
  } catch {
    error = "تاریخ نامعتبر است (مثال: ۱۴۰۵/۰۷/۰۱)";
  }
  if (!error && from && to && from >= to) {
    error = "تاریخ پایان نباید قبل از تاریخ شروع باشد";
  }
  if (error) {
    from = null;
    to = null;
  }

  return {
    filters: {
      status,
      from,
      to,
      q: toLatinDigits(raw.q),
      page,
      raw: { ...raw, status: status ?? "" },
    },
    error,
  };
}

/** رشته‌ی query برای لینک صفحه/خروجی با همان فیلترها */
export function orderFiltersQuery(
  filters: OrderFilters,
  overrides: { page?: number; status?: string } = {},
): string {
  const params = new URLSearchParams();
  const status = overrides.status ?? filters.raw.status;
  if (status) params.set("status", status);
  if (filters.raw.from) params.set("from", filters.raw.from);
  if (filters.raw.to) params.set("to", filters.raw.to);
  if (filters.raw.q) params.set("q", filters.raw.q);
  const page = overrides.page ?? 1;
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}
