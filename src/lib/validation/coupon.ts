import { z } from "zod";

import { isValidCouponCode, normalizeCouponCode } from "@/lib/coupon";
import { endOfTehranDay, parseJalaliDateInput } from "@/lib/date";
import { toPersianDigits } from "@/lib/utils";

const MAX_INT = 2_147_483_647;

function optionalInt(label: string, min: number) {
  return z
    .number({ error: `${label} باید عدد صحیح باشد` })
    .int(`${label} باید عدد صحیح باشد`)
    .min(min, `${label} باید حداقل ${toPersianDigits(min)} باشد`)
    .max(MAX_INT, `${label} بیش از حد بزرگ است`)
    .nullable();
}

/** تاریخ شمسی متنی ⇒ Date؛ نامعتبر ⇒ خطای همان فیلد */
function jalaliDate(label: string) {
  return z.string().transform((value, ctx) => {
    try {
      return parseJalaliDateInput(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: `${label} نامعتبر است (مثال: ۱۴۰۵/۰۷/۰۱)`,
      });
      return z.NEVER;
    }
  });
}

export const couponInputSchema = z
  .object({
    code: z.string().transform(normalizeCouponCode).refine(isValidCouponCode, {
      message: "کد باید ۳ تا ۳۲ کاراکتر از حروف لاتین، عدد، - یا _ باشد",
    }),
    title: z
      .string()
      .trim()
      .min(2, "عنوان حداقل ۲ کاراکتر باشد")
      .max(120, "عنوان حداکثر ۱۲۰ کاراکتر باشد"),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"], {
      error: "نوع تخفیف را انتخاب کنید",
    }),
    value: z
      .number({ error: "مقدار تخفیف باید عدد صحیح باشد" })
      .int("مقدار تخفیف باید عدد صحیح باشد")
      .min(0)
      .max(MAX_INT),
    maxDiscountAmount: optionalInt("سقف تخفیف", 1),
    minOrderAmount: optionalInt("حداقل مبلغ سبد", 1),
    scope: z.enum(["ALL", "CATEGORY", "PRODUCT"]),
    categoryIds: z.array(z.string().min(1)).max(200),
    productIds: z.array(z.string().min(1)).max(500),
    usageLimitTotal: optionalInt("سقف استفاده‌ی کل", 1),
    usageLimitPerUser: optionalInt("سقف استفاده‌ی هر کاربر", 1),
    firstOrderOnly: z.boolean(),
    startsAt: jalaliDate("تاریخ شروع"),
    expiresAt: jalaliDate("تاریخ پایان"),
    isActive: z.boolean(),
  })
  .superRefine((input, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (input.type === "PERCENT" && (input.value < 1 || input.value > 100)) {
      issue("value", "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد");
    }
    if (input.type === "FIXED" && input.value < 1) {
      issue("value", "مبلغ تخفیف باید حداقل ۱ تومان باشد");
    }
    if (input.scope === "CATEGORY" && input.categoryIds.length === 0) {
      issue("categoryIds", "حداقل یک دسته‌بندی انتخاب کنید");
    }
    if (input.scope === "PRODUCT" && input.productIds.length === 0) {
      issue("productIds", "حداقل یک محصول انتخاب کنید");
    }
    if (input.startsAt && input.expiresAt && input.startsAt > input.expiresAt) {
      issue("expiresAt", "تاریخ پایان نباید قبل از تاریخ شروع باشد");
    }
  })
  .transform((input) => ({
    ...input,
    // مقادیری که برای این نوع/دامنه معنا ندارند پاک می‌شوند
    value: input.type === "FREE_SHIPPING" ? 0 : input.value,
    maxDiscountAmount:
      input.type === "PERCENT" ? input.maxDiscountAmount : null,
    categoryIds: input.scope === "CATEGORY" ? input.categoryIds : [],
    productIds: input.scope === "PRODUCT" ? input.productIds : [],
    // «تا تاریخ …» شامل کل همان روز است
    expiresAt: input.expiresAt ? endOfTehranDay(input.expiresAt) : null,
  }));

export type CouponInput = z.output<typeof couponInputSchema>;
export type CouponFormInput = z.input<typeof couponInputSchema>;
