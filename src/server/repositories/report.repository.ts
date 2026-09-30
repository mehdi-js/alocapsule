import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * تجمیع‌های گزارش — 🔴 همه در SQL (نه جمع در جاوااسکریپت).
 *
 * «فروش» = سفارش پرداخت‌شده (`paidAt`) و لغونشده، به تاریخ **ثبت سفارش**
 * (`placedAt`) و مبلغ `grandTotal`. تخفیف جداگانه گزارش می‌شود.
 * جمع‌ها `bigint` برمی‌گردند (ممکن است از int32 بزرگ‌تر شوند).
 */

export interface Period {
  from: Date;
  to: Date;
}

/** شرط فروش روی جدول `Order` با نام مستعار `o` */
function salesWhere({ from, to }: Period): Prisma.Sql {
  return Prisma.sql`o."paidAt" IS NOT NULL
    AND o."status" <> 'CANCELED'
    AND o."placedAt" >= ${from}
    AND o."placedAt" < ${to}`;
}

const toNumber = (value: bigint | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

export interface SalesSummaryRow {
  sales: number;
  orders: number;
  discount: number;
  shipping: number;
  /** میانگین مبلغ سفارش (گرد به تومان) */
  average: number;
}

export async function salesSummary(period: Period): Promise<SalesSummaryRow> {
  const rows = await db.$queryRaw<
    {
      sales: bigint | null;
      orders: bigint;
      discount: bigint | null;
      shipping: bigint | null;
      average: bigint | null;
    }[]
  >`
    SELECT SUM(o."grandTotal")::bigint AS sales,
           COUNT(*)::bigint AS orders,
           SUM(o."discountTotal")::bigint AS discount,
           SUM(o."shippingTotal")::bigint AS shipping,
           ROUND(AVG(o."grandTotal"))::bigint AS average
    FROM "Order" o
    WHERE ${salesWhere(period)}
  `;
  const row = rows[0];
  return {
    sales: toNumber(row?.sales),
    orders: toNumber(row?.orders),
    discount: toNumber(row?.discount),
    shipping: toNumber(row?.shipping),
    average: toNumber(row?.average),
  };
}

/** فروش روزانه؛ روز = تاریخ محلی تهران (`YYYY-MM-DD` میلادی) */
export async function dailySales(
  period: Period,
): Promise<{ day: string; sales: number; orders: number }[]> {
  const rows = await db.$queryRaw<
    { day: string; sales: bigint; orders: bigint }[]
  >`
    SELECT to_char((o."placedAt" AT TIME ZONE 'Asia/Tehran')::date, 'YYYY-MM-DD') AS day,
           SUM(o."grandTotal")::bigint AS sales,
           COUNT(*)::bigint AS orders
    FROM "Order" o
    WHERE ${salesWhere(period)}
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map((row) => ({
    day: row.day,
    sales: toNumber(row.sales),
    orders: toNumber(row.orders),
  }));
}

/**
 * سهم دسته‌بندی‌ها از مبلغ اقلام (جمع `lineTotal`، پیش از تخفیف و بدون
 * ارسال). محصول حذف‌شده ⇒ «بدون دسته».
 */
export async function categoryShare(
  period: Period,
): Promise<{ name: string; total: number; quantity: number }[]> {
  const rows = await db.$queryRaw<
    { name: string | null; total: bigint; quantity: bigint }[]
  >`
    SELECT c."name" AS name,
           SUM(oi."lineTotal")::bigint AS total,
           SUM(oi."quantity")::bigint AS quantity
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    LEFT JOIN "Product" p ON p."id" = oi."productId"
    LEFT JOIN "Category" c ON c."id" = p."categoryId"
    WHERE ${salesWhere(period)}
    GROUP BY c."id", c."name"
    ORDER BY total DESC
  `;
  return rows.map((row) => ({
    name: row.name ?? "بدون دسته",
    total: toNumber(row.total),
    quantity: toNumber(row.quantity),
  }));
}

export type ReportProductKind = "PHYSICAL" | "SERVICE";

export interface KindSalesRow {
  kind: ReportProductKind;
  /** مبلغ اقلام (جمع `lineTotal`، پیش از تخفیف و بدون ارسال) */
  total: number;
  quantity: number;
  /** تعداد سفارش‌های فروشی که حداقل یک آیتم این نوع دارند */
  orders: number;
}

/**
 * فروش به تفکیک نوع محصول (خدمت / کالای فیزیکی) روی `productKindSnapshot`
 * آیتم‌ها؛ مبلغ = مبلغ اقلام (مثل سهم دسته‌بندی‌ها)، نه مبلغ نهایی سفارش،
 * چون سفارش مخلوط تخفیف و ارسال مشترک دارد.
 */
export async function salesByKind(period: Period): Promise<KindSalesRow[]> {
  const rows = await db.$queryRaw<
    {
      kind: ReportProductKind;
      total: bigint;
      quantity: bigint;
      orders: bigint;
    }[]
  >`
    SELECT oi."productKindSnapshot"::text AS kind,
           SUM(oi."lineTotal")::bigint AS total,
           SUM(oi."quantity")::bigint AS quantity,
           COUNT(DISTINCT o."id")::bigint AS orders
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE ${salesWhere(period)}
    GROUP BY oi."productKindSnapshot"
    ORDER BY total DESC
  `;
  return rows.map((row) => ({
    kind: row.kind,
    total: toNumber(row.total),
    quantity: toNumber(row.quantity),
    orders: toNumber(row.orders),
  }));
}

/** پرفروش‌ترین محصولات بر اساس مبلغ (نام و نوع از اسنپ‌شات سفارش) */
export async function topProducts(
  period: Period,
  limit = 10,
): Promise<
  { name: string; kind: ReportProductKind; quantity: number; total: number }[]
> {
  const rows = await db.$queryRaw<
    {
      name: string;
      kind: ReportProductKind;
      quantity: bigint;
      total: bigint;
    }[]
  >`
    SELECT MAX(oi."productName") AS name,
           (ARRAY_AGG(oi."productKindSnapshot"::text ORDER BY o."placedAt" DESC))[1] AS kind,
           SUM(oi."quantity")::bigint AS quantity,
           SUM(oi."lineTotal")::bigint AS total
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE ${salesWhere(period)}
    GROUP BY COALESCE(oi."productId", oi."productName")
    ORDER BY total DESC, quantity DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    name: row.name,
    kind: row.kind,
    quantity: toNumber(row.quantity),
    total: toNumber(row.total),
  }));
}

/** پرفروش‌ترین ترکیب‌ها: هر `variantId` جدا (شارژ ۱۱ پرسی ≠ شارژ ۱۱ بوتان) */
export async function topVariants(
  period: Period,
  limit = 10,
): Promise<
  {
    productName: string;
    variantTitle: string;
    quantity: number;
    total: number;
  }[]
> {
  const rows = await db.$queryRaw<
    {
      productName: string;
      variantTitle: string;
      quantity: bigint;
      total: bigint;
    }[]
  >`
    SELECT MAX(oi."productName") AS "productName",
           MAX(oi."variantTitle") AS "variantTitle",
           SUM(oi."quantity")::bigint AS quantity,
           SUM(oi."lineTotal")::bigint AS total
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE ${salesWhere(period)}
    GROUP BY COALESCE(oi."variantId", oi."productName" || '|' || oi."variantTitle")
    ORDER BY total DESC, quantity DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    productName: row.productName,
    variantTitle: row.variantTitle,
    quantity: toNumber(row.quantity),
    total: toNumber(row.total),
  }));
}

/** مبلغ کل تخفیف به تفکیک کد (سفارش‌های فروش در بازه) */
export async function discountByCoupon(
  period: Period,
): Promise<
  { code: string; orders: number; discount: number; sales: number }[]
> {
  const rows = await db.$queryRaw<
    { code: string; orders: bigint; discount: bigint; sales: bigint }[]
  >`
    SELECT o."couponCode" AS code,
           COUNT(*)::bigint AS orders,
           SUM(o."discountTotal")::bigint AS discount,
           SUM(o."grandTotal")::bigint AS sales
    FROM "Order" o
    WHERE ${salesWhere(period)} AND o."couponCode" IS NOT NULL
    GROUP BY o."couponCode"
    ORDER BY discount DESC
  `;
  return rows.map((row) => ({
    code: row.code,
    orders: toNumber(row.orders),
    discount: toNumber(row.discount),
    sales: toNumber(row.sales),
  }));
}

export function countAwaitingReview(): Promise<number> {
  return db.order.count({ where: { status: "PAYMENT_REVIEW" } });
}
