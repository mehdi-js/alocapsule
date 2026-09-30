import { BRAND_NAME } from "@/lib/brand";
import { DEFAULT_TEMPLATES } from "@/lib/notification-templates";

/**
 * داده‌ی پایه‌ی seed (تنظیمات فروشگاه). کاتالوگ محصولات در
 * `seed-catalog.ts` است.
 */

/** متن پیش‌فرض پیامک‌ها از همان منبع اپلیکیشن (بند ۷.۶) */
export const smsTemplates = DEFAULT_TEMPLATES;

/**
 * روش‌های ارسال نمونه. `requiresAddress` و `freeAboveQuantity` (بخش ۳.۳
 * `FORK.md`) در فاز F3 به این داده اضافه می‌شوند. هزینه‌ی پیک عدد نمونه است و
 * باید توسط الو کپسول تعیین شود.
 */
export const shippingMethods = [
  {
    id: "seed-shipping-courier",
    name: "ارسال با پیک",
    description: "ارسال با پیک به آدرس شما در تهران",
    cost: 100_000,
    payOnDelivery: false,
    freeAboveAmount: null,
    provinces: [] as string[],
    sortOrder: 1,
  },
  {
    id: "seed-shipping-pickup",
    name: "تحویل حضوری",
    description: "تحویل در محل الو کپسول، بدون هزینه‌ی ارسال",
    cost: 0,
    payOnDelivery: false,
    freeAboveAmount: null,
    provinces: [] as string[],
    sortOrder: 2,
  },
];

export const bankCard = {
  id: "seed-bank-card-1",
  bankName: "بانک نمونه",
  // شماره‌ی نمونه‌ی غیرواقعی (معتبر از نظر Luhn/mod-97)؛ قبل از انتشار از تنظیمات ادمین عوض شود
  cardNumber: "6037997599999993",
  shebaNumber: "IR820540102680020817909002",
  accountHolderName: `${BRAND_NAME} (نمونه — قبل از انتشار جایگزین شود)`,
  sortOrder: 1,
};
