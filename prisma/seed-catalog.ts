import type { PricingMode, ProductKind } from "@prisma/client";

import { todo } from "@/lib/brand";
import { toPersianDigits } from "@/lib/utils";

import {
  buyDescriptions,
  buyFaq,
  refillDescriptions,
  refillFaq,
  type SizeCode,
  SIZES,
} from "./seed-sizes";

/**
 * کاتالوگ الو کپسول (SEO.md §۲ و §۱۱): ۴ شارژ + ۴ خرید + دست دوم + پیک‌نیک +
 * اکسیژن + گازهای صنعتی. قیمت‌ها از سند (به‌روزرسانی ۲۱ شهریور ۱۴۰۵) و باید
 * کارفرما در ادمین تأیید کند. دست دوم و پیک‌نیک تا قیمت‌گذاری کارفرما
 * غیرفعال و `noindex` می‌مانند.
 *
 * 🔴 کدهای ثابت: `valve` (persi/butane) در شارژ؛ `fill` (empty/filled) در خرید و
 * دست دوم؛ `size` (11/25/33/50) در دست دوم — برای ریدایرکت‌ها و جدول hub.
 */

export interface SeedOption {
  name: string;
  code: string;
  values: { label: string; code: string }[];
}

export interface SeedVariant {
  /** کد گروه ⇒ کد مقدار (بدون گزینه `{}`) */
  selection: Record<string, string>;
  price: number;
  shippingWeightGrams: number;
  isActive: boolean;
}

export interface SeedCatalogProduct {
  name: string;
  slug: string;
  categorySlug: string;
  kind: ProductKind;
  pricingMode: PricingMode;
  isActive: boolean;
  noindex: boolean;
  sortOrder: number;
  shortDescription: string;
  description: string;
  seoTitle: string;
  metaDescription: string | null;
  focusKeyword: string;
  secondaryKeywords: string[];
  faq: { question: string; answer: string }[];
  options: SeedOption[];
  variants: SeedVariant[];
  /** نامک محصول متناظر (دوطرفه) */
  pairedSlug: string | null;
}

export { catalogCategories, type SeedCategory } from "./seed-categories";

const fa = toPersianDigits;
/** وزن ارسال نمونه (= ظرفیت)؛ مقدار واقعی را ادمین در فرم محصول تنظیم می‌کند */
const kg = (kilograms: number) => kilograms * 1000;

export const VALVE_OPTION: SeedOption = {
  name: "نوع شیر",
  code: "valve",
  values: [
    { label: "پرسی", code: "persi" },
    { label: "بوتان", code: "butane" },
  ],
};

export const FILL_OPTION: SeedOption = {
  name: "وضعیت تحویل",
  code: "fill",
  values: [
    { label: "خالی", code: "empty" },
    { label: "پرشده", code: "filled" },
  ],
};

const SIZE_OPTION: SeedOption = {
  name: "اندازه",
  code: "size",
  values: SIZES.map((size) => ({
    label: `${fa(size)} کیلویی`,
    code: size,
  })),
};

/** شارژ: قیمت پرسی و بوتان یکسان */
const REFILL_PRICES: Record<SizeCode, number> = {
  "11": 800_000,
  "25": 2_200_000,
  "33": 2_450_000,
  "50": 3_850_000,
};

/** خرید: خالی و پرشده (= خالی + شارژ همان اندازه؛ بند ۱۱) */
const BUY_PRICES: Record<SizeCode, { empty: number; filled: number }> = {
  "11": { empty: 6_000_000, filled: 6_800_000 },
  "25": { empty: 9_000_000, filled: 11_200_000 },
  "33": { empty: 11_500_000, filled: 13_950_000 },
  "50": { empty: 15_000_000, filled: 18_850_000 },
};

const REFILL_SEO: Record<
  SizeCode,
  { title: string; meta: string; secondary: string[] }
> = {
  "11": {
    title: "قیمت شارژ کپسول گاز ۱۱ کیلویی پرسی و بوتان",
    meta: "شارژ کپسول گاز ۱۱ کیلویی خانگی، پرسی و بوتان؛ کپسول خالی شما با یک کپسول ۱۱ کیلویی پرشده و آماده‌ی مصرف تعویض می‌شود. قیمت روز و سفارش آنلاین.",
    secondary: [
      "قیمت شارژ کپسول ۱۱ کیلویی",
      "شارژ کپسول ۱۱ کیلویی پرسی",
      "شارژ کپسول ۱۱ کیلویی بوتان",
      "کپسول گاز خانگی",
    ],
  },
  "25": {
    title: "قیمت شارژ کپسول گاز ۲۵ کیلویی پرسی و بوتان",
    meta: "شارژ کپسول گاز ۲۵ کیلویی برای مصرف بیشتر خانگی و کسب‌وکارها؛ تعویض سریع با کپسول پرشده‌ی هم‌نوع. قیمت روز و سفارش آنلاین از الو کپسول.",
    secondary: [
      "قیمت شارژ کپسول ۲۵ کیلویی",
      "شارژ کپسول ۲۵ کیلویی پرسی و بوتان",
    ],
  },
  "33": {
    title: "قیمت شارژ کپسول گاز ۳۳ کیلویی پرسی و بوتان",
    meta: "شارژ کپسول گاز ۳۳ کیلویی پرسی و بوتان برای رستوران، کافه و مصارف تجاری؛ کپسول خالی با کپسول پرشده تعویض می‌شود. سفارش آنلاین.",
    secondary: [
      "قیمت شارژ کپسول ۳۳ کیلویی",
      "شارژ کپسول ۳۳ کیلویی پرسی و بوتان",
    ],
  },
  "50": {
    title: "قیمت شارژ کپسول گاز ۵۰ کیلویی پرسی و بوتان",
    meta: "شارژ کپسول گاز ۵۰ کیلویی برای مصارف تجاری، کارگاهی و صنعتی؛ تعویض با کپسول پرشده‌ی هم‌نوع و ارسال. قیمت روز و سفارش آنلاین.",
    secondary: ["قیمت شارژ کپسول ۵۰ کیلویی", "شارژ کپسول ۵۰ کیلویی صنعتی"],
  },
};

const BUY_SEO: Record<
  SizeCode,
  { title: string; meta: string; secondary: string[] }
> = {
  "11": {
    title: "قیمت و خرید کپسول گاز ۱۱ کیلویی؛ خالی یا پرشده",
    meta: "خرید کپسول گاز ۱۱ کیلویی نو برای مصرف خانگی، به‌صورت خالی یا پرشده و آماده‌ی مصرف. قیمت روز، سفارش آنلاین و ارسال در تهران.",
    secondary: [
      "قیمت کپسول گاز ۱۱ کیلویی",
      "کپسول گاز ۱۱ کیلویی پر شده",
      "کپسول گاز ۱۱ کیلویی نو",
    ],
  },
  "25": {
    title: "قیمت و خرید کپسول گاز ۲۵ کیلویی؛ خالی یا پرشده",
    meta: "خرید کپسول گاز ۲۵ کیلویی نو، خالی یا پرشده؛ مناسب مصرف بیشتر خانگی و کسب‌وکارها. قیمت روز و سفارش آنلاین از الو کپسول.",
    secondary: ["قیمت کپسول گاز ۲۵ کیلویی", "کپسول ۲۵ کیلویی پر شده"],
  },
  "33": {
    title: "قیمت و خرید کپسول گاز ۳۳ کیلویی؛ خالی یا پرشده",
    meta: "خرید کپسول گاز ۳۳ کیلویی نو برای رستوران، کافه و مصارف تجاری؛ خالی یا پرشده و آماده‌ی مصرف. سفارش آنلاین و ارسال در تهران.",
    secondary: ["قیمت کپسول گاز ۳۳ کیلویی", "کپسول ۳۳ کیلویی پر شده"],
  },
  "50": {
    title: "قیمت و خرید کپسول گاز ۵۰ کیلویی؛ خالی یا پرشده",
    meta: "خرید کپسول گاز ۵۰ کیلویی نو برای مصارف صنعتی و تجاری، خالی یا پرشده. قیمت روز، سفارش آنلاین و ارسال در تهران از الو کپسول.",
    secondary: [
      "قیمت کپسول گاز ۵۰ کیلویی",
      "کپسول گاز ۵۰ کیلویی نو",
      "کپسول ۵۰ کیلویی صنعتی",
    ],
  },
};

function refillProduct(size: SizeCode, index: number): SeedCatalogProduct {
  const seo = REFILL_SEO[size];
  return {
    name: `شارژ کپسول گاز ${fa(size)} کیلویی`,
    slug: `gas-capsule-refill-${size}kg`,
    categorySlug: "gas-capsule-refill",
    kind: "SERVICE",
    pricingMode: "FIXED",
    isActive: true,
    noindex: false,
    sortOrder: index + 1,
    shortDescription: `تعویض کپسول خالی ${fa(size)} کیلویی شما با کپسول پرشده‌ی پرسی یا بوتان`,
    description: refillDescriptions[size],
    seoTitle: seo.title,
    metaDescription: seo.meta,
    focusKeyword: `شارژ کپسول گاز ${fa(size)} کیلویی`,
    secondaryKeywords: seo.secondary,
    faq: refillFaq[size],
    options: [VALVE_OPTION],
    variants: VALVE_OPTION.values.map((value) => ({
      selection: { valve: value.code },
      price: REFILL_PRICES[size],
      shippingWeightGrams: kg(Number(size)),
      isActive: true,
    })),
    pairedSlug: `buy-gas-capsule-${size}kg`,
  };
}

function buyProduct(size: SizeCode, index: number): SeedCatalogProduct {
  const seo = BUY_SEO[size];
  const prices = BUY_PRICES[size];
  return {
    name: `خرید کپسول گاز ${fa(size)} کیلویی`,
    slug: `buy-gas-capsule-${size}kg`,
    categorySlug: "buy-gas-capsule",
    kind: "PHYSICAL",
    pricingMode: "FIXED",
    isActive: true,
    noindex: false,
    sortOrder: index + 1,
    shortDescription: `کپسول گاز نو ${fa(size)} کیلویی، خالی یا پرشده و آماده‌ی مصرف`,
    description: buyDescriptions[size],
    seoTitle: seo.title,
    metaDescription: seo.meta,
    focusKeyword: `خرید کپسول گاز ${fa(size)} کیلویی`,
    secondaryKeywords: seo.secondary,
    faq: buyFaq[size],
    options: [FILL_OPTION],
    variants: [
      {
        selection: { fill: "empty" },
        price: prices.empty,
        shippingWeightGrams: kg(Number(size)),
        isActive: true,
      },
      {
        selection: { fill: "filled" },
        price: prices.filled,
        shippingWeightGrams: kg(Number(size)),
        isActive: true,
      },
    ],
    pairedSlug: `gas-capsule-refill-${size}kg`,
  };
}

const USED_DESCRIPTION = [
  "خرید کپسول گاز دست دوم در اندازه‌های ۱۱، ۲۵، ۳۳ و ۵۰ کیلویی، به‌صورت خالی یا پرشده و آماده‌ی مصرف؛ گزینه‌ای اقتصادی برای مصارف خانگی، تجاری و کارگاهی. اندازه‌ی مورد نیاز خود را انتخاب کنید و در صورت تمایل، کپسول را پرشده تحویل بگیرید.",
  "## کپسول‌های دست دوم تست سلامت شده",
  "همه‌ی کپسول‌های گاز دست دوم الو کپسول پیش از فروش تست سلامت می‌شوند تا با اطمینان به دست شما برسند.",
  "## کپسول دست دوم یا نو؟",
  "کپسول دست دوم معمولاً با قیمت کمتری نسبت به [کپسول گاز نو](/category/buy-gas-capsule) عرضه می‌شود و برای کسانی مناسب است که می‌خواهند هزینه‌ی اولیه را کم کنند. اگر ترجیح می‌دهید کپسول نو داشته باشید، اندازه‌ی مورد نظرتان را در بخش خرید کپسول گاز نو مقایسه کنید؛ اگر فقط به تعویض کپسول خالی خود نیاز دارید، [شارژ کپسول گاز](/category/gas-capsule-refill) را ببینید.",
  "## کدام اندازه را انتخاب کنم؟",
  "اندازه‌ی ۱۱ کیلویی برای مصارف خانگی رایج است، ۲۵ کیلویی برای مصرف بیشتر خانگی و کسب‌وکارهای کوچک، ۳۳ کیلویی برای رستوران و کافه و ۵۰ کیلویی برای مصارف تجاری، کارگاهی و پروژه‌ای. هر اندازه را می‌توانید در گزینه‌ی «اندازه» همین صفحه انتخاب کنید.",
  "## خالی یا پرشده؟",
  "در حالت خالی فقط قیمت خود کپسول را می‌پردازید و در حالت پرشده، کپسول با گاز پر شده و آماده‌ی مصرف تحویل داده می‌شود. قیمت هر ترکیب از اندازه و وضعیت تحویل در جعبه‌ی قیمت بالای صفحه نمایش داده می‌شود.",
  "## قیمت و شرایط",
  todo(
    "قیمت هر اندازه و وضعیت تحویل کپسول دست دوم، و شرایط تست سلامت (کارفرما در ادمین وارد می‌کند)",
  ),
].join("\n\n");

const PICNIC_DESCRIPTION = [
  "خرید پیک‌نیک در سایزهای مختلف گزینه‌ای مناسب برای تأمین گاز مورد نیاز در مصارف خانگی، سفر، کمپینگ و سایر کاربردهای روزمره است. پیک‌نیک‌ها در ظرفیت‌های متنوع عرضه می‌شوند تا متناسب با میزان مصرف و نوع استفاده، گزینه‌ی مناسب خود را انتخاب کنید.",
  "این محصولات با طراحی قابل حمل و ابعاد مناسب، جابه‌جایی و استفاده‌ی آسانی دارند و برای کسانی که به یک منبع گاز قابل حمل نیاز دارند، انتخابی کاربردی هستند. پیک‌نیک‌های الو کپسول **پرشده و آماده‌ی مصرف** تحویل داده می‌شوند.",
  "## پیک‌نیک را چطور انتخاب کنم؟",
  "سایز را با مدت و نوع استفاده بسنجید: برای یک سفر کوتاه یا استفاده‌ی گاه‌به‌گاه سایز کوچک‌تر و برای سفرهای طولانی‌تر یا استفاده‌ی مکرر سایز بزرگ‌تر مناسب‌تر است. اگر برای مصرف ثابت خانه به گاز نیاز دارید، [شارژ کپسول گاز](/category/gas-capsule-refill) یا [خرید کپسول گاز نو](/category/buy-gas-capsule) گزینه‌ی بهتری است.",
  "## پیک‌نیک پرشده یعنی چه؟",
  "پیک‌نیک‌های الو کپسول پرشده تحویل داده می‌شوند، یعنی لازم نیست پیش از سفر یا استفاده برای پر کردن آن‌ها جایی بروید. پس از اتمام گاز، برای تأمین دوباره‌ی گاز می‌توانید دوباره از همین صفحه سفارش دهید. پرداخت سفارش آنلاین و به‌صورت کارت‌به‌کارت یا از کیف پول انجام می‌شود و تحویل در شهر تهران با پیک یا حضوری است.",
  "## سایزها و قیمت",
  todo(
    "سایزها و قیمت پیک‌نیک‌ها (کارفرما در ادمین وارد می‌کند؛ سپس محصول فعال و noindex برداشته شود)",
  ),
].join("\n\n");

const OXYGEN_DESCRIPTION = [
  "شارژ کپسول اکسیژن ۴۰ لیتری با تجهیزات مناسب و رعایت الزامات ایمنی برای مصارف درمانی، صنعتی و کارگاهی انجام می‌شود. این خدمت به‌صورت استعلامی ارائه می‌شود؛ برای اطلاع از قیمت و شرایط با ما تماس بگیرید.",
  "## استعلام قیمت شارژ کپسول اکسیژن",
  "قیمت شارژ کپسول اکسیژن ۴۰ لیتری بسته به شرایط سفارش اعلام می‌شود و در سایت قیمت ثابتی ندارد. برای دریافت قیمت و هماهنگی، از دکمه‌ی تماس همین صفحه استفاده کنید یا شماره‌ی تلفن سایت را بگیرید.",
  "## گازهای دیگر",
  "اگر به شارژ آرگون، نیتروژن، CO₂ یا گازهای ترکیبی نیاز دارید، [شارژ کپسول گازهای صنعتی و ترکیبی](/products/industrial-gas-refill) را ببینید. برای کپسول گاز مایع (LPG) خانگی و تجاری هم می‌توانید [شارژ کپسول گاز](/category/gas-capsule-refill) را بررسی کنید.",
  "## چطور سفارش بدهم؟",
  "چون قیمت این خدمت استعلامی است، سفارش آن مثل کالاهای دیگر از سبد خرید ثبت نمی‌شود. با شماره‌ی تلفن یا واتساپ سایت تماس بگیرید، نوع نیاز و تعداد کپسول را بگویید و شرایط، قیمت و زمان تحویل را هماهنگ کنید. اگر پیش‌تر از خدمت شارژ ما استفاده کرده‌اید، شماره‌ی سفارش قبلی را هم اعلام کنید تا هماهنگی سریع‌تر شود.",
  "## جزئیات خدمت",
  todo(
    "جزئیات خدمت شارژ اکسیژن ۴۰ لیتری (شرایط پذیرش کپسول، مجوزها و استانداردها) — بدون ادعای پزشکی",
  ),
].join("\n\n");

const INDUSTRIAL_DESCRIPTION = [
  "شارژ کپسول گازهای صنعتی و ترکیبی مانند آرگون، نیتروژن و CO₂ برای جوشکاری، صنایع غذایی و آزمایشگاه انجام می‌شود. این خدمت به‌صورت استعلامی ارائه می‌شود و قیمت آن با توجه به نوع گاز و تعداد کپسول اعلام می‌شود.",
  "## استعلام قیمت شارژ گاز صنعتی",
  "برای دریافت قیمت شارژ کپسول آرگون، نیتروژن، CO₂ یا گاز ترکیبی جوشکاری، از دکمه‌ی تماس همین صفحه استفاده کنید و نوع گاز و تعداد کپسول را اعلام کنید.",
  "## گازهای دیگر",
  "برای شارژ کپسول اکسیژن ۴۰ لیتری [شارژ کپسول اکسیژن](/products/oxygen-capsule-refill) را ببینید. برای کپسول‌های گاز مایع مصارف خانگی و تجاری، [شارژ کپسول گاز](/category/gas-capsule-refill) را بررسی کنید.",
  "## چطور سفارش بدهم؟",
  "قیمت شارژ گازهای صنعتی بسته به نوع گاز و تعداد کپسول تعیین می‌شود، پس سفارش آن از سبد خرید ثبت نمی‌شود. با شماره‌ی تلفن یا واتساپ سایت تماس بگیرید، نوع گاز، ظرفیت و تعداد کپسول‌ها را بگویید و قیمت و زمان تحویل را هماهنگ کنید. برای مصرف‌کنندگان دائمی، هماهنگی تحویل دوره‌ای هم از همین راه انجام می‌شود.",
  "## جزئیات خدمت",
  todo("فهرست گازهای قابل شارژ، ظرفیت کپسول‌ها و شرایط پذیرش کپسول صنعتی"),
].join("\n\n");

export const catalogProducts: SeedCatalogProduct[] = [
  ...SIZES.map(refillProduct),
  ...SIZES.map(buyProduct),
  {
    name: "خرید کپسول گاز دست دوم",
    slug: "used-gas-capsule",
    categorySlug: "used-gas-capsules",
    kind: "PHYSICAL",
    pricingMode: "FIXED",
    // تا قیمت‌گذاری کارفرما غیرفعال و noindex
    isActive: false,
    noindex: true,
    sortOrder: 1,
    shortDescription:
      "کپسول گاز دست دوم تست سلامت شده، خالی یا پرشده، در چهار اندازه",
    description: USED_DESCRIPTION,
    seoTitle: "خرید کپسول گاز دست دوم ۱۱ تا ۵۰ کیلویی",
    metaDescription:
      "خرید کپسول گاز دست دوم تست سلامت شده ۱۱، ۲۵، ۳۳ و ۵۰ کیلویی، خالی یا پرشده؛ گزینه‌ای اقتصادی برای مصارف خانگی و تجاری. سفارش آنلاین و ارسال در تهران.",
    focusKeyword: "کپسول گاز دست دوم",
    secondaryKeywords: [
      "خرید کپسول گاز دست دوم",
      "قیمت کپسول گاز دست دوم",
      "کپسول گاز ۱۱ کیلویی دست دوم",
    ],
    faq: [],
    options: [SIZE_OPTION, FILL_OPTION],
    // ۸ ترکیب غیرفعال و بدون قیمت؛ کارفرما قیمت می‌دهد و فعال می‌کند
    variants: SIZES.flatMap((size) =>
      FILL_OPTION.values.map((fill) => ({
        selection: { size, fill: fill.code },
        price: 0,
        shippingWeightGrams: kg(Number(size)),
        isActive: false,
      })),
    ),
    pairedSlug: null,
  },
  {
    name: "خرید پیک‌نیک گاز",
    slug: "picnic-gas",
    categorySlug: "picnic",
    kind: "PHYSICAL",
    pricingMode: "FIXED",
    isActive: false,
    noindex: true,
    sortOrder: 1,
    shortDescription: "پیک‌نیک گاز پرشده و آماده‌ی مصرف در سایزهای مختلف",
    description: PICNIC_DESCRIPTION,
    seoTitle: "خرید پیک نیک گاز پرشده در سایزهای مختلف",
    metaDescription:
      "خرید پیک‌نیک گاز پرشده و آماده‌ی مصرف در سایزهای مختلف؛ قابل حمل و مناسب سفر، کمپینگ و مصارف روزمره. سفارش آنلاین و ارسال در تهران.",
    focusKeyword: "خرید پیک نیک",
    secondaryKeywords: ["پیک نیک پر شده", "گاز پیک نیک", "پیک نیک ۵ کیلویی"],
    faq: [],
    // گروه «سایز» بدون مقدار؛ کارفرما مقدارها و قیمت‌ها را اضافه می‌کند
    options: [{ name: "سایز", code: "size", values: [] }],
    variants: [],
    pairedSlug: null,
  },
  {
    name: "شارژ کپسول اکسیژن ۴۰ لیتری",
    slug: "oxygen-capsule-refill",
    categorySlug: "other-gases",
    kind: "SERVICE",
    pricingMode: "INQUIRY",
    isActive: true,
    noindex: false,
    sortOrder: 1,
    shortDescription: "شارژ کپسول اکسیژن ۴۰ لیتری؛ قیمت با استعلام تلفنی",
    description: OXYGEN_DESCRIPTION,
    seoTitle: "شارژ کپسول اکسیژن ۴۰ لیتری صنعتی و درمانی",
    metaDescription:
      "شارژ کپسول اکسیژن ۴۰ لیتری با تجهیزات مناسب و رعایت الزامات ایمنی برای مصارف درمانی، صنعتی و کارگاهی. برای استعلام قیمت تماس بگیرید.",
    focusKeyword: "شارژ کپسول اکسیژن",
    secondaryKeywords: ["کپسول اکسیژن ۴۰ لیتری", "شارژ اکسیژن صنعتی"],
    faq: [],
    options: [],
    variants: [],
    pairedSlug: "industrial-gas-refill",
  },
  {
    name: "شارژ کپسول گازهای صنعتی و ترکیبی",
    slug: "industrial-gas-refill",
    categorySlug: "other-gases",
    kind: "SERVICE",
    pricingMode: "INQUIRY",
    isActive: true,
    noindex: false,
    sortOrder: 2,
    shortDescription: "شارژ آرگون، نیتروژن، CO₂ و گاز ترکیبی؛ قیمت با استعلام",
    description: INDUSTRIAL_DESCRIPTION,
    // کلمه‌ی کانونی SEO.md §۲.۵ در عنوان نیامده بود (چک تحلیلگر) ⇒ در عنوان آمد
    seoTitle: "شارژ گاز صنعتی: آرگون، CO2، نیتروژن و گاز ترکیبی",
    metaDescription:
      "شارژ گاز صنعتی و ترکیبی مانند آرگون، نیتروژن و CO₂ برای جوشکاری، صنایع غذایی و آزمایشگاه. برای استعلام قیمت شارژ کپسول تماس بگیرید.",
    focusKeyword: "شارژ گاز صنعتی",
    secondaryKeywords: [
      "شارژ کپسول آرگون",
      "شارژ کپسول CO2",
      "شارژ کپسول نیتروژن",
      "گاز ترکیبی جوشکاری",
    ],
    faq: [],
    options: [],
    variants: [],
    pairedSlug: "oxygen-capsule-refill",
  },
];

/** تاریخ به‌روزرسانی قیمت‌های seed: ۲۱ شهریور ۱۴۰۵ */
export const SEED_PRICE_UPDATED_JALALI = [1405, 6, 21] as const;
