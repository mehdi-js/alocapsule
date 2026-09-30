import { formatJalali, fromTehranIsoDate } from "@/lib/date";
import {
  calendarPeriods,
  rangeDays,
  type ReportRange,
} from "@/lib/report-range";
import {
  categoryShare,
  countAwaitingReview,
  dailySales,
  discountByCoupon,
  type KindSalesRow,
  salesByKind,
  salesSummary,
  type SalesSummaryRow,
  topProducts,
  topVariants,
} from "@/server/repositories/report.repository";

/**
 * داده‌ی داشبورد ادمین. عددها همه از تجمیع SQL می‌آیند؛ اینجا فقط
 * روزهای بدون فروش برای نمودار با صفر پر و برچسب شمسی ساخته می‌شوند.
 */

export interface DashboardDto {
  cards: {
    today: SalesSummaryRow;
    week: SalesSummaryRow;
    month: SalesSummaryRow;
    awaitingReview: number;
  };
  range: {
    summary: SalesSummaryRow;
    daily: { day: string; label: string; sales: number; orders: number }[];
    categories: { name: string; total: number; quantity: number }[];
    /** خدمت و کالای فیزیکی همیشه هر دو هستند (صفر اگر فروشی نیست) */
    kinds: KindSalesRow[];
    topProducts: {
      name: string;
      kind: "PHYSICAL" | "SERVICE";
      quantity: number;
      total: number;
    }[];
    topVariants: {
      productName: string;
      variantTitle: string;
      quantity: number;
      total: number;
    }[];
    discounts: {
      code: string;
      orders: number;
      discount: number;
      sales: number;
    }[];
  };
}

export async function getDashboard(
  range: ReportRange,
  now: Date = new Date(),
): Promise<DashboardDto> {
  const periods = calendarPeriods(now);
  const [
    today,
    week,
    month,
    awaitingReview,
    summary,
    daily,
    categories,
    kinds,
    products,
    variants,
    discounts,
  ] = await Promise.all([
    salesSummary(periods.today),
    salesSummary(periods.week),
    salesSummary(periods.month),
    countAwaitingReview(),
    salesSummary(range),
    dailySales(range),
    categoryShare(range),
    salesByKind(range),
    topProducts(range),
    topVariants(range),
    discountByCoupon(range),
  ]);

  // کلید روز: تاریخ شمسی لاتین (یکتا)؛ روز بدون فروش ⇒ صفر
  const byDay = new Map(
    daily.map((row) => [
      formatJalali(fromTehranIsoDate(row.day), "YYYY/MM/DD", { digits: "en" }),
      row,
    ]),
  );
  const filled = rangeDays(range).map((day) => {
    const key = formatJalali(day, "YYYY/MM/DD", { digits: "en" });
    const row = byDay.get(key);
    return {
      day: key,
      label: formatJalali(day, "MM/DD"),
      sales: row?.sales ?? 0,
      orders: row?.orders ?? 0,
    };
  });

  return {
    cards: { today, week, month, awaitingReview },
    range: {
      summary,
      daily: filled,
      categories,
      kinds: (["SERVICE", "PHYSICAL"] as const).map(
        (kind) =>
          kinds.find((row) => row.kind === kind) ?? {
            kind,
            total: 0,
            quantity: 0,
            orders: 0,
          },
      ),
      topProducts: products,
      topVariants: variants,
      discounts,
    },
  };
}
