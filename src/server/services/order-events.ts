import { after } from "next/server";

import type { OrderNotificationType } from "@/lib/order-status";

import { sendOrderNotification } from "./notification.service";

/**
 * نقطه‌ی رویدادهای سفارش (بند ۷.۶). همیشه **پس از commit** تراکنش صدا زده
 * می‌شود و هرگز خطا به بیرون نمی‌دهد.
 *
 * داخل درخواست (Server Action / Route Handler) ارسال پیامک با `after()` پس
 * از فرستادن پاسخ انجام می‌شود تا کندی ملی پیامک کاربر را معطل نکند؛ بیرون
 * از درخواست (job یا تست) همان‌جا منتظر می‌ماند.
 */
export async function publishOrderEvent(
  type: OrderNotificationType,
  orderId: string,
): Promise<void> {
  const task = () => sendOrderNotification(type, orderId);
  try {
    after(task);
    return;
  } catch {
    // بیرون از محدوده‌ی درخواست: after در دسترس نیست
  }
  await task();
}

/** چند پیامک یک انتقال (مثلاً مشتری + مدیر)، به ترتیب */
export async function publishOrderEvents(
  types: readonly OrderNotificationType[],
  orderId: string,
): Promise<void> {
  for (const type of types) await publishOrderEvent(type, orderId);
}
