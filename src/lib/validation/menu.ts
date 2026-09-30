import { z } from "zod";

import { toPersianDigits } from "@/lib/utils";

/** اعتبارسنجی منوی شعبه‌ها (صفحه‌ی QR) */

const MAX_PRICE = 100_000_000;

/** URL کوتاه لاتین تا QR ساده و خوانا بماند (مثل `valiasr`) */
export const MENU_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} را وارد کنید`)
    .max(max, `${label} حداکثر ${toPersianDigits(max)} کاراکتر باشد`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} حداکثر ${toPersianDigits(max)} کاراکتر باشد`)
    .nullish()
    .transform((value) => value || null);

export const menuInputSchema = z.object({
  name: text("نام منو", 2, 60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "نشانی حداقل ۲ کاراکتر باشد")
    .max(40, "نشانی حداکثر ۴۰ کاراکتر باشد")
    .regex(
      MENU_SLUG_PATTERN,
      "نشانی فقط حروف کوچک انگلیسی، عدد و خط تیره (مثل valiasr)",
    ),
  description: optionalText("توضیح", 120),
  isActive: z.boolean(),
});

export const menuCategoryInputSchema = z.object({
  name: text("نام دسته", 1, 40),
});

export const menuItemInputSchema = z.object({
  categoryId: z.string().min(1, "دسته را انتخاب کنید"),
  name: text("نام آیتم", 1, 60),
  description: optionalText("توضیح", 160),
  price: z
    .number({ error: "قیمت باید عدد صحیح باشد" })
    .int("قیمت باید عدد صحیح باشد")
    .min(1, "قیمت را وارد کنید")
    .max(MAX_PRICE, "قیمت بیش از حد بزرگ است"),
});

/** ترتیب جدید: فهرست شناسه‌ها بدون تکرار */
export const reorderSchema = z
  .array(z.string().min(1))
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length);

export type MenuInput = z.output<typeof menuInputSchema>;
export type MenuFormInput = z.input<typeof menuInputSchema>;
export type MenuItemInput = z.output<typeof menuItemInputSchema>;
export type MenuItemFormInput = z.input<typeof menuItemInputSchema>;
