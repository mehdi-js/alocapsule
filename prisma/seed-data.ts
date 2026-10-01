import { BRAND_NAME } from "@/lib/brand";
import { DEFAULT_TEMPLATES } from "@/lib/notification-templates";

/**
 * داده‌ی پایه‌ی seed (تنظیمات فروشگاه). کاتالوگ محصولات در
 * `seed-catalog.ts` است.
 */

/** متن پیش‌فرض پیامک‌ها از همان منبع اپلیکیشن (بند ۷.۶) */
export const smsTemplates = DEFAULT_TEMPLATES;

/**
 * روش‌های ارسال (SEO.md §۴.۸ و §۱۱). هزینه‌ی عادی و فوری را کارفرما وارد می‌کند؛
 * تا آن موقع این دو روش **غیرفعال** seed می‌شوند (هزینه‌ی صفر یعنی ارسال رایگان و
 * نباید تصادفی منتشر شود). تحویل حضوری رایگان و فعال است.
 */
export const shippingMethods = [
  {
    id: "seed-shipping-normal",
    name: "ارسال عادی",
    description: "ارسال با پیک به آدرس شما در شهر تهران",
    cost: 0,
    payOnDelivery: false,
    freeAboveAmount: null,
    freeAboveQuantity: 100,
    requiresAddress: true,
    deliveryEstimate: "۱ روزه",
    businessHoursOnly: false,
    provinces: [] as string[],
    isActive: false,
    sortOrder: 1,
  },
  {
    id: "seed-shipping-express",
    name: "ارسال فوری",
    description: "ارسال سریع در ساعات کاری به آدرس شما در شهر تهران",
    cost: 0,
    payOnDelivery: false,
    freeAboveAmount: null,
    freeAboveQuantity: null,
    requiresAddress: true,
    deliveryEstimate: "۱ تا ۴ ساعت",
    businessHoursOnly: true,
    provinces: [] as string[],
    isActive: false,
    sortOrder: 2,
  },
  {
    id: "seed-shipping-pickup",
    name: "تحویل حضوری",
    description: "تحویل در محل الو کپسول، بدون هزینه‌ی ارسال",
    cost: 0,
    payOnDelivery: false,
    freeAboveAmount: null,
    freeAboveQuantity: null,
    requiresAddress: false,
    deliveryEstimate: null,
    businessHoursOnly: false,
    provinces: [] as string[],
    isActive: true,
    sortOrder: 3,
  },
];

/** روش ارسال نمونه‌ی فاز قبل (جایگزین شد) */
export const LEGACY_SHIPPING_IDS = ["seed-shipping-courier"];

export const bankCard = {
  id: "seed-bank-card-1",
  bankName: "بانک نمونه",
  // شماره‌ی نمونه‌ی غیرواقعی (معتبر از نظر Luhn/mod-97)؛ قبل از انتشار از تنظیمات ادمین عوض شود
  cardNumber: "6037997599999993",
  shebaNumber: "IR820540102680020817909002",
  accountHolderName: `${BRAND_NAME} (نمونه — قبل از انتشار جایگزین شود)`,
  sortOrder: 1,
};
