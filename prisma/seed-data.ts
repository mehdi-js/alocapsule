import { DEFAULT_TEMPLATES } from "@/lib/notification-templates";

/**
 * داده‌ی پایه‌ی seed (تنظیمات فروشگاه و منوی نمونه). کاتالوگ محصولات در
 * `seed-catalog.ts` است.
 */

/** متن پیش‌فرض پیامک‌ها از همان منبع اپلیکیشن (بند ۷.۶) */
export const smsTemplates = DEFAULT_TEMPLATES;

/** فقط ارسال با پیک؛ هزینه‌ی پیک درب منزل توسط مشتری پرداخت می‌شود */
export const shippingMethods = [
  {
    id: "seed-shipping-courier",
    name: "ارسال با پیک",
    description: "هزینه‌ی پیک جداگانه درب منزل توسط مشتری پرداخت می‌شود",
    cost: 0,
    payOnDelivery: true,
    freeAboveAmount: null,
    provinces: [] as string[],
    sortOrder: 1,
  },
];

export const bankCard = {
  id: "seed-bank-card-1",
  bankName: "بانک ملی ایران",
  // نمونه‌ی معتبر از نظر Luhn/mod-97؛ قبل از انتشار از تنظیمات ادمین عوض شود
  cardNumber: "6037997599999993",
  shebaNumber: "IR820540102680020817909002",
  accountHolderName: "علی‌حان (نمونه — قبل از انتشار جایگزین شود)",
  sortOrder: 1,
};

/** منوی نمونه‌ی شعبه (صفحه‌ی `/menu/valiasr`)؛ فقط اگر منویی با این نشانی نباشد ساخته می‌شود */
export const sampleMenu = {
  name: "شعبه ولیعصر",
  slug: "valiasr",
  description: "خیابان ولیعصر · هر روز ۱۰ تا ۲۳",
  categories: [
    {
      name: "باقلوا",
      items: [
        ["باقلوای پسته‌ای", "پسته‌ی احمدآقایی، هر پرس ۴ عدد", 185_000],
        ["باقلوای گردویی", "گردوی تازه و شربت سبک", 145_000],
        ["شوبیت", "لایه‌های نازک با مغز پسته", 195_000],
        ["باقلوای بستنی", "باقلوای گرم با بستنی وانیلی", 220_000],
      ],
    },
    {
      name: "دمنوش‌ها",
      items: [
        ["دمنوش به‌لیمو و نعنا", null, 85_000],
        ["دمنوش گل‌گاوزبان", "با لیمو عمانی", 90_000],
        ["دمنوش سیب و دارچین", null, 95_000],
      ],
    },
    {
      name: "نوشیدنی گرم",
      items: [
        ["چای ترکی", "دم‌کرده در سماور", 45_000],
        ["قهوه ترک", null, 95_000],
        ["سحلب", "با دارچین و پودر پسته", 110_000],
      ],
    },
  ] satisfies {
    name: string;
    items: [name: string, description: string | null, price: number][];
  }[],
};
