import { toPersianDigits } from "@/lib/utils";

/** واحد فروش محصول (مطابق enum `ProductUnit` در فاز ۱). */
export type ProductUnit = "GRAM" | "PIECE";

function assertUnitValue(unitValue: number): void {
  if (!Number.isInteger(unitValue) || unitValue <= 0) {
    throw new RangeError(`Invalid unitValue: ${unitValue}`);
  }
}

/**
 * عنوان خودکار متغیر محصول:
 * GRAM زیر ۱۰۰۰ ⇒ «۵۰۰ گرم»، از ۱۰۰۰ به بالا ⇒ «۱ کیلوگرم» / «۱.۵ کیلوگرم»،
 * PIECE ⇒ «۱۲ عددی».
 */
export function getVariantTitle(unit: ProductUnit, unitValue: number): string {
  assertUnitValue(unitValue);

  if (unit === "PIECE") {
    return `${toPersianDigits(unitValue)} عددی`;
  }
  if (unitValue < 1000) {
    return `${toPersianDigits(unitValue)} گرم`;
  }
  const kilograms = Number((unitValue / 1000).toFixed(3));
  return `${toPersianDigits(kilograms)} کیلوگرم`;
}

/** عنوان دستیِ ادمین اولویت دارد؛ اگر خالی بود عنوان خودکار. */
export function resolveVariantTitle(
  unit: ProductUnit,
  unitValue: number,
  customTitle?: string | null,
): string {
  const custom = customTitle?.trim();
  return custom ? custom : getVariantTitle(unit, unitValue);
}

/**
 * قیمت هر کیلو: `round(price / unitValue × 1000)`.
 * فقط برای محصولات GRAM معنا دارد؛ برای PIECE مقدار `null` برمی‌گردد.
 */
export function calculatePricePerKg(
  unit: ProductUnit,
  price: number,
  unitValue: number,
): number | null {
  if (unit !== "GRAM") return null;
  assertUnitValue(unitValue);
  if (!Number.isSafeInteger(price) || price < 0) {
    throw new RangeError(`Invalid price: ${price}`);
  }
  return Math.round((price / unitValue) * 1000);
}

/**
 * وزن بسته‌بندی (جعبه، سلوفن، محافظ) که به وزن محصول برای پیشنهاد وزن ارسال
 * اضافه می‌شود. مقدار دقیق هنوز تعیین نشده؛ ادمین وزن ارسال هر متغیر را در
 * فرم محصول تنظیم می‌کند.
 */
export const DEFAULT_PACKAGING_GRAMS = 0;

/**
 * وزن ارسال پیشنهادیِ یک متغیر (تعدادِ خرید در سبد ضرب می‌شود).
 * فقط برای GRAM قابل پیشنهاد است؛ برای PIECE وزن جعبه را ادمین وارد می‌کند.
 */
export function suggestShippingWeightGrams(
  unit: ProductUnit,
  unitValue: number,
  packagingGrams = DEFAULT_PACKAGING_GRAMS,
): number | null {
  if (unit !== "GRAM") return null;
  assertUnitValue(unitValue);
  return unitValue + packagingGrams;
}
