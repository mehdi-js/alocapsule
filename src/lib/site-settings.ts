import type { Prisma } from "@prisma/client";

import type { EnamadSeal } from "@/lib/enamad";
import {
  ABOUT_PAGE,
  CONTACT,
  SHIPPING_NOTE,
  SOCIAL,
  TRUST_ITEMS,
} from "@/lib/site-content";
import { toLatinDigits } from "@/lib/utils";

/**
 * تنظیمات محتوای سایت که ادمین ویرایش می‌کند (Setting با کلید
 * `site.content`). هر بخشِ نبود یا نامعتبر به پیش‌فرض `site-content.ts`
 * برمی‌گردد تا سایت هرگز بدون متن نماند.
 */

export const SITE_CONTENT_KEY = "site.content";

export type SocialKey = "instagram" | "telegram" | "whatsapp";

export interface SiteSettings {
  contact: { phone: string; email: string; address: string };
  /** آدرس کامل؛ خالی ⇒ آیکون نمایش داده نمی‌شود */
  social: Record<SocialKey, string>;
  /** نوار اعتماد (آیکون‌ها ثابت‌اند: کیفیت، ارسال، بسته‌بندی) */
  trustItems: { title: string; subtitle: string }[];
  aboutStats: { value: string; label: string }[];
  shippingNote: string;
  /** نماد اعتماد الکترونیکی؛ `null` ⇒ در فوتر نمایش داده نمی‌شود */
  enamad: EnamadSeal | null;
}

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  whatsapp: "واتساپ",
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contact: {
    phone: CONTACT.phone,
    email: CONTACT.email,
    address: CONTACT.address,
  },
  social: Object.fromEntries(
    SOCIAL.map((item) => [item.icon, item.href]),
  ) as Record<SocialKey, string>,
  trustItems: TRUST_ITEMS.map((item) => ({
    title: item.title,
    subtitle: item.subtitle,
  })),
  aboutStats: ABOUT_PAGE.stats.map((stat) => ({ ...stat })),
  shippingNote: SHIPPING_NOTE,
  enamad: null,
};

type Json = Prisma.JsonValue;

function isObject(value: Json | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: Json | undefined, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function list<T>(
  value: Json | undefined,
  fallback: T[],
  parse: (item: Prisma.JsonObject) => T | null,
): T[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.flatMap((item) => {
    if (!isObject(item)) return [];
    const parsed = parse(item);
    return parsed ? [parsed] : [];
  });
  return items;
}

/** فقط شناسه و کد با الگوی مجاز (همان‌که parseEnamadCode می‌پذیرد) */
function readEnamad(value: Json | undefined): EnamadSeal | null {
  if (!isObject(value)) return null;
  const { id, code } = value;
  return typeof id === "string" &&
    typeof code === "string" &&
    /^\d{1,12}$/.test(id) &&
    /^[A-Za-z0-9]{4,40}$/.test(code)
    ? { id, code }
    : null;
}

/** مقدار ذخیره‌شده (هر شکلی) ⇒ تنظیمات کامل با پیش‌فرض‌ها */
export function parseSiteSettings(stored: Json | null): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS;
  if (!isObject(stored ?? undefined)) return d;
  const value = stored as Prisma.JsonObject;
  const contact = isObject(value.contact) ? value.contact : {};
  const social = isObject(value.social) ? value.social : {};
  const trustItems = list(value.trustItems, d.trustItems, (item) => ({
    title: text(item.title, ""),
    subtitle: text(item.subtitle, ""),
  }));
  const aboutStats = list(value.aboutStats, d.aboutStats, (item) => ({
    value: text(item.value, ""),
    label: text(item.label, ""),
  }));
  return {
    contact: {
      phone: text(contact.phone, d.contact.phone),
      email: text(contact.email, d.contact.email),
      address: text(contact.address, d.contact.address),
    },
    social: {
      instagram: text(social.instagram, d.social.instagram),
      telegram: text(social.telegram, d.social.telegram),
      whatsapp: text(social.whatsapp, d.social.whatsapp),
    },
    // سه کاشی نوار اعتماد و چهار آمار همیشه کامل‌اند
    trustItems: trustItems.length === 3 ? trustItems : d.trustItems,
    aboutStats: aboutStats.length === 4 ? aboutStats : d.aboutStats,
    shippingNote: text(value.shippingNote, d.shippingNote),
    enamad: readEnamad(value.enamad),
  };
}

/** `۰۲۱-۲۲۳۴۵۶۷۸` ⇒ `tel:+982122345678` (لینک تماس) */
export function phoneHref(phone: string): string {
  const digits = toLatinDigits(phone).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("0")) return `tel:+98${digits.slice(1)}`;
  return `tel:${digits}`;
}

/** شبکه‌های اجتماعی پرشده، به ترتیب نمایش */
export function socialLinks(
  social: SiteSettings["social"],
): { key: SocialKey; label: string; href: string }[] {
  return (Object.keys(SOCIAL_LABELS) as SocialKey[])
    .filter((key) => social[key].trim() !== "")
    .map((key) => ({ key, label: SOCIAL_LABELS[key], href: social[key] }));
}
