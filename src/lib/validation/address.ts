import { z } from "zod";

import { normalizePhone } from "@/lib/phone";
import { isServedLocation, OUT_OF_AREA_MESSAGE } from "@/lib/service-area";
import { toLatinDigits } from "@/lib/utils";

export const MAX_ADDRESSES_PER_USER = 20;

export const addressInputSchema = z
  .object({
    receiverName: z
      .string()
      .trim()
      .min(2, "نام گیرنده حداقل ۲ کاراکتر باشد")
      .max(80, "نام گیرنده حداکثر ۸۰ کاراکتر باشد"),
    receiverPhone: z.string().transform((value, ctx) => {
      const phone = normalizePhone(value);
      if (!phone) {
        ctx.addIssue({
          code: "custom",
          message: "شماره‌ی موبایل گیرنده نامعتبر است",
        });
        return z.NEVER;
      }
      return phone;
    }),
    province: z.string().trim().min(1, "استان را انتخاب کنید"),
    city: z.string().trim().min(1, "شهر را انتخاب کنید"),
    postalCode: z
      .string()
      .transform((value) => toLatinDigits(value).replace(/[\s-]/g, ""))
      .refine((value) => value === "" || /^\d{10}$/.test(value), {
        message: "کد پستی باید ۱۰ رقم باشد",
      })
      .transform((value) => value || null),
    line: z
      .string()
      .trim()
      .min(10, "نشانی حداقل ۱۰ کاراکتر باشد")
      .max(300, "نشانی حداکثر ۳۰۰ کاراکتر باشد"),
    isDefault: z.boolean(),
  })
  .superRefine((input, ctx) => {
    if (input.province && input.city) {
      if (!isServedLocation(input.province, input.city)) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: OUT_OF_AREA_MESSAGE,
        });
      }
    }
  });

export type AddressInput = z.output<typeof addressInputSchema>;
export type AddressFormInput = z.input<typeof addressInputSchema>;
