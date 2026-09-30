import { toPersianDigits } from "@/lib/utils";

/** مبلغ معتبر: عدد صحیح، غیرمنفی و در محدوده‌ی امن (هرگز float). */
export function isValidToman(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount >= 0;
}

export function assertToman(amount: number): void {
  if (!isValidToman(amount)) {
    throw new RangeError(`Invalid toman amount: ${amount}`);
  }
}

/** فرمول واحد سفارش: `grandTotal = subtotal + shippingTotal − discountTotal`. */
export function calculateGrandTotal(
  subtotal: number,
  shippingTotal: number,
  discountTotal: number,
): number {
  assertToman(subtotal);
  assertToman(shippingTotal);
  assertToman(discountTotal);
  if (discountTotal > subtotal + shippingTotal) {
    throw new RangeError("discountTotal exceeds subtotal + shippingTotal");
  }
  return subtotal + shippingTotal - discountTotal;
}

/** `1500000` → `۱,۵۰۰,۰۰۰` (جداکننده‌ی هزارگان طبق سند طراحی، کاما) */
export function formatToman(amount: number): string {
  assertToman(amount);
  return toPersianDigits(amount.toLocaleString("en-US"));
}

/** `1500000` → `۱,۵۰۰,۰۰۰ تومان` */
export function formatTomanWithUnit(amount: number): string {
  return `${formatToman(amount)} تومان`;
}
