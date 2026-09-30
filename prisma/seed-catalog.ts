import type { ProductUnit } from "@prisma/client";

import { todo } from "@/lib/brand";

/**
 * ۴ محصول نمونه (بخش ۶.۱ `FORK.md`) برای تست هر حالت؛ محتوای واقعی کاتالوگ از
 * `SEO.md` الو کپسول می‌آید.
 *
 * - محصول ۴ (اکسیژن) استعلامی است؛ تا افزودن `kind`/`pricingMode` (فاز F3)
 *   غیرفعال و بدون متغیر ساخته می‌شود.
 * - قیمت‌ها و ارقام نمونه‌اند؛ هر ادعای واقعی با `todo()` علامت خورده است.
 * - محصولات دارای متغیر فعال‌اند تا چرخه‌ی کامل خرید قابل تست باشد.
 */

export interface SeedVariant {
  /** ۱۱۰۰۰ ⇒ «۱۱ کیلوگرم» برای GRAM؛ ۱ برای PIECE */
  unitValue: number;
  price: number;
  /** خالی ⇒ عنوان خودکار (`lib/unit.ts`) */
  title?: string;
  shippingWeightGrams: number;
}

export interface SeedCatalogProduct {
  name: string;
  slug: string;
  categorySlug: string;
  unit: ProductUnit;
  isActive: boolean;
  shortDescription: string;
  description: string;
  seoTitle: string;
  metaDescription: string | null;
  focusKeyword: string | null;
  variants: SeedVariant[];
}

export { catalogCategories, type SeedCategory } from "./seed-categories";

const paragraphs = (...items: string[]) => items.join("\n\n");

/** وزن ارسال نمونه؛ مقدار واقعی را ادمین در فرم محصول تنظیم می‌کند */
const kg = (kilograms: number) => kilograms * 1000;

export const catalogProducts: SeedCatalogProduct[] = [
  {
    name: "شارژ کپسول گاز بوتان",
    slug: "charge-butane",
    categorySlug: "lpg-charge",
    unit: "GRAM",
    isActive: true,
    shortDescription: "تعویض کپسول خالی شما با کپسول پرشده‌ی بوتان",
    description: paragraphs(
      "در خدمت شارژ، کپسول خالی شما با یک کپسول پرشده و آماده‌ی مصرف هم‌اندازه و هم‌نوع تعویض می‌شود.",
      todo("توضیحات کامل خدمت شارژ بوتان"),
    ),
    seoTitle: "شارژ کپسول گاز بوتان",
    metaDescription: null,
    focusKeyword: null,
    variants: [
      { unitValue: kg(11), price: 800_000, shippingWeightGrams: kg(11) },
      { unitValue: kg(25), price: 2_200_000, shippingWeightGrams: kg(25) },
      { unitValue: kg(33), price: 2_450_000, shippingWeightGrams: kg(33) },
      { unitValue: kg(50), price: 3_850_000, shippingWeightGrams: kg(50) },
    ],
  },
  {
    name: "خرید کپسول گاز ۱۱ کیلویی",
    slug: "buy-cylinder-11kg",
    categorySlug: "lpg-buy",
    unit: "PIECE",
    isActive: true,
    shortDescription: "کپسول گاز نو ۱۱ کیلویی",
    description: paragraphs(
      "کپسول گاز نو ۱۱ کیلویی.",
      todo("مشخصات فنی و شرایط گارانتی کپسول"),
    ),
    seoTitle: "خرید کپسول گاز ۱۱ کیلویی",
    metaDescription: null,
    focusKeyword: null,
    variants: [
      {
        unitValue: 1,
        title: "۱۱ کیلوگرم",
        price: 6_000_000,
        shippingWeightGrams: kg(11),
      },
    ],
  },
  {
    name: "پیک‌نیک",
    slug: "picnic-set",
    categorySlug: "picnic",
    unit: "PIECE",
    isActive: true,
    shortDescription: "کپسول و لوازم گازی پیک‌نیک",
    description: paragraphs(
      todo("مشخصات و قیمت واقعی محصول پیک‌نیک (قیمت فعلی نمونه است)"),
    ),
    seoTitle: "خرید کپسول پیک‌نیک",
    metaDescription: null,
    focusKeyword: null,
    variants: [{ unitValue: 1, price: 500_000, shippingWeightGrams: 1000 }],
  },
  {
    name: "شارژ کپسول اکسیژن ۴۰ کیلویی",
    slug: "charge-oxygen-40kg",
    categorySlug: "other-gases",
    unit: "PIECE",
    // استعلامی: بدون متغیر و غیرفعال تا فاز F3 (`pricingMode = INQUIRY`)
    isActive: false,
    shortDescription: "شارژ کپسول اکسیژن ۴۰ کیلویی (استعلام قیمت)",
    description: paragraphs(todo("توضیحات خدمت شارژ اکسیژن")),
    seoTitle: "شارژ کپسول اکسیژن ۴۰ کیلویی",
    metaDescription: null,
    focusKeyword: null,
    variants: [],
  },
];
