import type { PricingMode, ProductKind } from "@prisma/client";

/**
 * منطق خالص محصول خدمت/استعلامی در سبد و سفارش (FORK.md §۴.۱ و §۴.۲).
 */

/** قابل سفارش بودن: متغیر و محصول فعال و **قیمت‌دار** (استعلامی هرگز سفارش نمی‌شود) */
export function isSellable(line: {
  variantActive: boolean;
  productActive: boolean;
  pricingMode: PricingMode;
}): boolean {
  return (
    line.variantActive && line.productActive && line.pricingMode === "FIXED"
  );
}

export const SERVICE_TERMS_REQUIRED_MESSAGE =
  "برای ثبت سفارش خدمت، باید شرایط تعویض کپسول را بپذیرید.";

export interface ServiceLine {
  kind: ProductKind;
  productName: string;
  /** متن مؤثر شرایط همین محصول (اختصاصی یا پیش‌فرض) */
  terms: string | null;
}

/**
 * متن شرایطی که مشتری می‌پذیرد: شرایط **همه‌ی** محصولات خدمت سبد، بدون تکرار.
 * اگر همه یک متن دارند فقط همان یک‌بار؛ اگر متن‌ها فرق دارند هر متن با نام
 * محصول(های) خودش می‌آید. بدون آیتم خدمت ⇒ `null`.
 */
export function collectServiceTerms(lines: ServiceLine[]): string | null {
  const groups = new Map<string, string[]>();
  for (const line of lines) {
    if (line.kind !== "SERVICE" || !line.terms?.trim()) continue;
    const text = line.terms.trim();
    const names = groups.get(text) ?? [];
    if (!names.includes(line.productName)) names.push(line.productName);
    groups.set(text, names);
  }
  if (groups.size === 0) return null;
  if (groups.size === 1) return [...groups.keys()][0]!;
  return [...groups]
    .map(([text, names]) => `**${names.join("، ")}**\n${text}`)
    .join("\n\n");
}

export interface EmptyCylinderRow {
  /** «نام محصول — عنوان متغیر» */
  label: string;
  quantity: number;
}

/**
 * «کپسول‌های خالی قابل تحویل گرفتن»: تعداد آیتم‌های خدمت به تفکیک محصول و
 * متغیر (مثلاً «۳ × شارژ کپسول بوتان — ۱۱ کیلوگرم»). اقلام کالای فیزیکی نمی‌آیند.
 */
export function summarizeEmptyCylinders(
  items: {
    productKindSnapshot: ProductKind;
    productName: string;
    variantTitle: string;
    quantity: number;
  }[],
): EmptyCylinderRow[] {
  const rows = new Map<string, EmptyCylinderRow>();
  for (const item of items) {
    if (item.productKindSnapshot !== "SERVICE") continue;
    const label = `${item.productName} — ${item.variantTitle}`;
    const row = rows.get(label) ?? { label, quantity: 0 };
    row.quantity += item.quantity;
    rows.set(label, row);
  }
  return [...rows.values()];
}
