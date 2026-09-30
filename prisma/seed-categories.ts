/**
 * دسته‌های نمونه‌ی فروشگاه (بخش ۶.۱ `FORK.md`). فقط نام و توضیح یک‌خطی؛ متن
 * بلند و کلمات کلیدی هر دسته را `SEO.md` الو کپسول تعیین می‌کند
 * (`introText` و `bottomContent` عمداً خالی‌اند).
 */

export interface SeedCategory {
  name: string;
  slug: string;
  parentSlug: string | null;
  /** زیرعنوان صفحه‌ی دسته (یک جمله) */
  description: string;
  seoTitle: string;
  metaDescription: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  introText: string;
  /** متن با قالب `lib/rich-text.ts` (`##` سرتیتر، `[متن](/آدرس)` لینک) */
  bottomContent: string;
  noindex: boolean;
  /** نمایش در بخش دسته‌های صفحه‌ی اصلی */
  isFeatured: boolean;
  sortOrder: number;
}

const base = {
  parentSlug: null,
  metaDescription: null,
  focusKeyword: null,
  secondaryKeywords: [] as string[],
  introText: "",
  bottomContent: "",
  noindex: false,
  isFeatured: true,
};

export const catalogCategories: SeedCategory[] = [
  {
    ...base,
    name: "شارژ کپسول گاز",
    slug: "lpg-charge",
    description: "تعویض کپسول خالی شما با کپسول پرشده",
    seoTitle: "شارژ کپسول گاز",
    sortOrder: 1,
  },
  {
    ...base,
    name: "خرید کپسول گاز",
    slug: "lpg-buy",
    description: "کپسول گاز نو",
    seoTitle: "خرید کپسول گاز",
    sortOrder: 2,
  },
  {
    ...base,
    name: "پیک‌نیک",
    slug: "picnic",
    description: "کپسول و لوازم گازی پیک‌نیک",
    seoTitle: "لوازم گازی پیک‌نیک",
    sortOrder: 3,
  },
  {
    ...base,
    name: "سایر گازها",
    slug: "other-gases",
    description: "شارژ گازهای دیگر مثل اکسیژن",
    seoTitle: "شارژ سایر گازها",
    sortOrder: 4,
  },
];
