/** برچسب‌های کیف پول (پنل کاربر و ادمین) */

export type WalletTxReason =
  "ADMIN_CREDIT" | "ADMIN_DEBIT" | "ORDER_PAYMENT" | "ORDER_REFUND";

export const WALLET_REASON_LABELS: Record<WalletTxReason, string> = {
  ADMIN_CREDIT: "شارژ توسط فروشگاه",
  ADMIN_DEBIT: "کسر توسط فروشگاه",
  ORDER_PAYMENT: "پرداخت سفارش",
  ORDER_REFUND: "بازگشت وجه سفارش",
};

/** سقف هر تغییر دستی موجودی توسط ادمین (جلوی خطای تایپ صفرهای اضافه) */
export const MAX_WALLET_ADJUSTMENT = 1_000_000_000;
