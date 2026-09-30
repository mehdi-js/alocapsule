/**
 * عنوان یک قلم سفارش/سبد: «نام محصول · عنوان ترکیب» (مثل «شارژ کپسول گاز ۱۱
 * کیلویی · پرسی»). محصول بدون گزینه عنوان ترکیب ندارد ⇒ فقط نام محصول.
 */
export function itemLabel(productName: string, variantTitle: string): string {
  const title = variantTitle.trim();
  return title ? `${productName} · ${title}` : productName;
}

/** «(پرسی)» برای نمایش کنار نام؛ بدون عنوان ⇒ رشته‌ی خالی (نه «()») */
export function variantSuffix(variantTitle: string): string {
  const title = variantTitle.trim();
  return title ? `(${title})` : "";
}
