import { toLatinDigits } from "@/lib/utils";

/** منطق خالص پرداخت کارت به کارت و نمایش کارت بانکی */

export type PaymentStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type PaymentMethod = "CARD_TO_CARD" | "WALLET" | "GATEWAY";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "در انتظار رسید",
  SUBMITTED: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD_TO_CARD: "کارت به کارت",
  WALLET: "کیف پول",
  GATEWAY: "درگاه آنلاین",
};

/** `6037991200000000` ⇒ `6037 9912 0000 0000` (برای نمایش LTR) */
export function formatCardNumber(cardNumber: string): string {
  const digits = toLatinDigits(cardNumber).replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** فقط ارقام، برای کپی در کلیپ‌بورد */
export function cardDigits(cardNumber: string): string {
  return toLatinDigits(cardNumber).replace(/\D/g, "");
}
