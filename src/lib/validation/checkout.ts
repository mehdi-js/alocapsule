import { z } from "zod";

export const placeOrderSchema = z.object({
  /** فقط وقتی روش ارسال آدرس لازم دارد (تحویل حضوری بدون آدرس)؛ سرور طبق روش ارسال بررسی می‌کند */
  addressId: z
    .string()
    .max(64)
    .nullish()
    .transform((value) => value || null),
  shippingMethodId: z.string().min(1, "روش ارسال را انتخاب کنید").max(64),
  /** پذیرش شرایط خدمت؛ فقط برای سبد دارای آیتم خدمت لازم است (سرور بررسی می‌کند) */
  acceptServiceTerms: z.boolean().optional().default(false),
  customerNote: z
    .string()
    .trim()
    .max(500, "توضیحات سفارش حداکثر ۵۰۰ کاراکتر باشد")
    .transform((value) => value || null),
  /**
   * مبلغی که مشتری در صفحه دید. قیمت از این گرفته نمی‌شود؛ فقط اگر مبلغ
   * محاسبه‌ی سرور متفاوت بود، سفارش ثبت نمی‌شود تا مشتری خلاصه‌ی تازه را ببیند.
   */
  expectedGrandTotal: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export type PlaceOrderInput = z.output<typeof placeOrderSchema>;
