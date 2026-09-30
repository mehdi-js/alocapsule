import { richTextToPlain } from "@/lib/rich-text";
import { toLatinDigits } from "@/lib/utils";

import { absoluteUrl } from "./canonical";
import { hasCompletionMarker } from "./settings";
import { truncateAtWord } from "./text";

/**
 * داده‌ی ساختاریافته (SEO.md §۷). خروجی‌ها شیء ساده‌اند و با `JsonLd`
 * (escape `<`) رندر می‌شوند. 🔴 هیچ `aggregateRating`/`review` (سیستم نظر
 * نداریم) و هیچ عدد یا ادعایی که در صفحه دیده نمی‌شود.
 */

type JsonObject = Record<string, unknown>;

/** تومان کد ISO ندارد ⇒ ریال (IRR) = تومان × ۱۰؛ رشته‌ی ارقام لاتین */
export function tomanToRial(toman: number): string {
  return String(Math.round(toman) * 10);
}

/** مقدارهای جای‌نگهدار «{{تکمیل توسط …}}» هرگز وارد schema نمی‌شوند */
function real(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text && !hasCompletionMarker(text) ? text : undefined;
}

/** «۰۲۱-۲۲۳۴۵۶۷۸» ⇒ «+982122345678» */
export function toE164(phone: string): string | undefined {
  const digits = toLatinDigits(phone).replace(/[^\d+]/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+98${digits.slice(1)}`;
  return digits;
}

export interface OrganizationInput {
  siteUrl: string;
  brandName: string;
  alternateNames: string[];
  legalName: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  /** آدرس کامل شبکه‌های اجتماعی */
  sameAs: string[];
}

export function organizationJsonLd(input: OrganizationInput): JsonObject {
  const telephone = input.phone ? toE164(input.phone) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization", input.siteUrl),
    name: input.brandName,
    alternateName: input.alternateNames.length
      ? input.alternateNames
      : undefined,
    legalName: real(input.legalName),
    url: absoluteUrl("/", input.siteUrl),
    logo: input.logoUrl ? absoluteUrl(input.logoUrl, input.siteUrl) : undefined,
    email: real(input.email),
    sameAs: input.sameAs.length ? input.sameAs : undefined,
    contactPoint: telephone
      ? {
          "@type": "ContactPoint",
          telephone,
          contactType: "customer service",
          areaServed: "IR",
          availableLanguage: ["fa"],
        }
      : undefined,
  };
}

export function websiteJsonLd(input: {
  siteUrl: string;
  brandName: string;
  alternateNames: string[];
}): JsonObject {
  // SearchAction عمداً نیست (گوگل کنارش گذاشته است، SEO.md §۷.۲)
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.brandName,
    alternateName: input.alternateNames.length
      ? input.alternateNames
      : undefined,
    url: absoluteUrl("/", input.siteUrl),
    inLanguage: "fa-IR",
    publisher: { "@id": absoluteUrl("/#organization", input.siteUrl) },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** مسیر نسبی؛ آخرین مورد (صفحه‌ی فعلی) هم آدرس دارد */
  path: string;
}

export function breadcrumbJsonLd(
  items: BreadcrumbItem[],
  siteUrl: string,
): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, siteUrl),
    })),
  };
}

export interface ProductJsonLdInput {
  siteUrl: string;
  brandName: string;
  name: string;
  slug: string;
  description: string | null;
  categoryName: string;
  images: string[];
  /** قیمت متغیرها به تومان (فعال‌ها؛ برای محصول غیرفعال همه) */
  variants: { price: number; sku: string | null }[];
  /** SEO.md §۴.۳: فعال ⇒ InStock، غیرفعال ⇒ OutOfStock */
  available: boolean;
}

export function productJsonLd(input: ProductJsonLdInput): JsonObject {
  const url = absoluteUrl(`/products/${input.slug}`, input.siteUrl);
  const availability = input.available
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const prices = input.variants.map((variant) => variant.price);
  const skus = input.variants.flatMap((variant) =>
    variant.sku ? [variant.sku] : [],
  );
  const description = truncateAtWord(
    richTextToPlain(input.description).replace(/\s+/g, " ").trim(),
    300,
  );

  let offers: JsonObject | undefined;
  if (prices.length === 1) {
    offers = {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: tomanToRial(prices[0]!),
      availability,
      url,
    };
  } else if (prices.length > 1) {
    offers = {
      "@type": "AggregateOffer",
      priceCurrency: "IRR",
      lowPrice: tomanToRial(Math.min(...prices)),
      highPrice: tomanToRial(Math.max(...prices)),
      offerCount: prices.length,
      availability,
      url,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: real(description),
    image: input.images.length
      ? input.images.map((image) => absoluteUrl(image, input.siteUrl))
      : undefined,
    sku: skus.length === 1 ? skus[0] : undefined,
    brand: { "@type": "Brand", name: input.brandName },
    category: input.categoryName,
    url,
    offers,
  };
}

export function itemListJsonLd(
  items: { name: string; path: string }[],
  siteUrl: string,
): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path, siteUrl),
    })),
  };
}

/** سوال‌هایی که پاسخشان هنوز جای‌نگهدار است وارد schema نمی‌شوند */
export function faqPageJsonLd(
  items: { question: string; answer: string }[],
): JsonObject | null {
  const real = items.filter(
    (item) =>
      !hasCompletionMarker(item.question) && !hasCompletionMarker(item.answer),
  );
  if (real.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: real.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export interface LocalBusinessInput {
  siteUrl: string;
  brandName: string;
  name: string;
  slug: string;
  city: string;
  district: string | null;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  mapUrl: string | null;
  /** خروجی `openingHoursSpecification` */
  openingHours: Record<string, unknown>[];
  /** زیرنوع schema.org (مثلاً `Store`)؛ پیش‌فرض `LocalBusiness` */
  schemaType?: string;
}

/** شعبه/محل کسب‌وکار: `LocalBusiness` با آدرس، تلفن، ساعات و مختصات */
export function localBusinessJsonLd(input: LocalBusinessInput): JsonObject {
  const telephone = toE164(input.phone);
  return {
    "@context": "https://schema.org",
    "@type": input.schemaType ?? "LocalBusiness",
    name: `${input.brandName} — ${input.name}`,
    url: absoluteUrl(`/branches/${input.slug}`, input.siteUrl),
    parentOrganization: {
      "@id": absoluteUrl("/#organization", input.siteUrl),
    },
    telephone,
    image: input.image ? absoluteUrl(input.image, input.siteUrl) : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: real(input.address),
      addressLocality: real(input.district ?? input.city),
      addressRegion: real(input.city),
      addressCountry: "IR",
    },
    geo:
      input.latitude !== null && input.longitude !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: input.latitude,
            longitude: input.longitude,
          }
        : undefined,
    hasMap: input.mapUrl ?? undefined,
    openingHoursSpecification: input.openingHours.length
      ? input.openingHours
      : undefined,
  };
}
