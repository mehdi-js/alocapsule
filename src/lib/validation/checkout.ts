import { z } from "zod";

export const placeOrderSchema = z.object({
  addressId: z.string().min(1, "آدرس ارسال را انتخاب کنید").max(64),
  shippingMethodId: z.string().min(1, "روش ارسال را انتخاب کنید").max(64),
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
