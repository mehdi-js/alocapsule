import type { Metadata } from "next";

import { absoluteUrl, listingCanonicalPath } from "./canonical";
import { resolveTitleTemplate } from "./settings";
import {
  buildDocumentTitle,
  effectiveMeta,
  effectiveTitle,
  type TitleSettings,
} from "./title";

/**
 * سازنده‌های Metadata صفحات عمومی (SEO.md §۵.۱). همه‌ی صفحات فقط از این‌ها
 * استفاده می‌کنند تا canonical مطلق، OG، twitter و robots یکسان باشد.
 * `<meta name="keywords">` عمداً ساخته نمی‌شود.
 */

export interface SeoContext extends TitleSettings {
  siteUrl: string;
  defaultDescription: string;
  /** تصویر OG پیش‌فرض؛ خالی ⇒ بدون تصویر */
  defaultOgImage: string | null;
  /** `ALLOW_INDEXING` */
  allowIndexing: boolean;
}

export interface OgImageInput {
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export function robotsFor(
  context: Pick<SeoContext, "allowIndexing">,
  noindex = false,
): NonNullable<Metadata["robots"]> {
  if (!context.allowIndexing) return { index: false, follow: false };
  return noindex
    ? { index: false, follow: true }
    : { index: true, follow: true };
}

interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

function ogImages(
  context: SeoContext,
  image: OgImageInput | null | undefined,
): OgImage[] | undefined {
  const chosen =
    image ?? (context.defaultOgImage ? { url: context.defaultOgImage } : null);
  if (!chosen) return undefined;
  return [
    {
      url: absoluteUrl(chosen.url, context.siteUrl),
      ...(chosen.width ? { width: chosen.width } : {}),
      ...(chosen.height ? { height: chosen.height } : {}),
      ...(chosen.alt ? { alt: chosen.alt } : {}),
    },
  ];
}

interface PageInput {
  /** عنوان بدون برند (قالب اضافه می‌کند) */
  title: string;
  description: string;
  /** مسیر canonical نسبی یا آدرس کامل */
  canonical: string;
  noindex?: boolean;
  image?: OgImageInput | null;
}

function buildPage(context: SeoContext, input: PageInput): Metadata {
  const url = absoluteUrl(input.canonical, context.siteUrl);
  const fullTitle = buildDocumentTitle(input.title, context);
  const images = ogImages(context, input.image);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: robotsFor(context, input.noindex),
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: context.brandName,
      title: fullTitle,
      description: input.description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: images?.map((image) => image.url),
    },
  };
}

/** Layout ریشه: metadataBase، قالب عنوان، robots پیش‌فرض و تأیید Search Console */
export function buildRootMetadata(
  context: SeoContext,
  input: {
    homeTitle: string;
    verification: { google: string | null; bing: string | null };
  },
): Metadata {
  return {
    metadataBase: new URL(context.siteUrl),
    title: {
      default: input.homeTitle,
      template: resolveTitleTemplate(context.titleTemplate, context.brandName),
    },
    description: context.defaultDescription,
    robots: robotsFor(context),
    applicationName: context.brandName,
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: context.brandName,
    },
    twitter: { card: "summary_large_image" },
    verification: {
      ...(input.verification.google
        ? { google: input.verification.google }
        : {}),
      ...(input.verification.bing
        ? { other: { "msvalidate.01": input.verification.bing } }
        : {}),
    },
  };
}

/** صفحه‌ی اصلی: عنوان absolute (بدون قالب) */
export function buildHomeMetadata(
  context: SeoContext,
  home: { title: string; description: string },
): Metadata {
  const page = buildPage(context, {
    title: home.title,
    description: home.description,
    canonical: "/",
  });
  return {
    ...page,
    title: { absolute: home.title },
    openGraph: { ...page.openGraph, title: home.title },
    twitter: { ...page.twitter, title: home.title },
  };
}

export function buildProductMetadata(
  context: SeoContext,
  product: {
    name: string;
    slug: string;
    seoTitle: string | null;
    metaDescription: string | null;
    description: string | null;
    noindex: boolean;
    canonicalUrl: string | null;
    image: OgImageInput | null;
  },
): Metadata {
  return buildPage(context, {
    title: effectiveTitle(product.seoTitle, product.name),
    description:
      effectiveMeta(product.metaDescription, product.description) ||
      context.defaultDescription,
    canonical: product.canonicalUrl || `/products/${product.slug}`,
    noindex: product.noindex,
    image: product.image,
  });
}

export interface ListingState {
  page: number;
  /** فیلتر یا مرتب‌سازی فعال */
  filtered: boolean;
  /** جستجو ⇒ `noindex, follow` */
  search: boolean;
}

export function buildCategoryMetadata(
  context: SeoContext,
  category: {
    name: string;
    slug: string;
    seoTitle: string | null;
    metaDescription: string | null;
    /** متن صفحه برای متای خودکار */
    text: string | null;
    noindex: boolean;
  },
  listing: ListingState,
): Metadata {
  const basePath = `/category/${category.slug}`;
  return buildPage(context, {
    title: effectiveTitle(category.seoTitle, category.name),
    description:
      effectiveMeta(category.metaDescription, category.text) ||
      context.defaultDescription,
    canonical: listingCanonicalPath(basePath, listing),
    noindex: category.noindex || listing.search,
  });
}

/** صفحات ساده (همه‌ی محصولات، درباره ما، تماس، شعب) */
export function buildPageMetadata(
  context: SeoContext,
  page: {
    title: string;
    description: string | null;
    path: string;
    noindex?: boolean;
    listing?: ListingState;
  },
): Metadata {
  return buildPage(context, {
    title: page.title,
    description: page.description || context.defaultDescription,
    canonical: page.listing
      ? listingCanonicalPath(page.path, page.listing)
      : page.path,
    noindex: page.noindex || page.listing?.search,
  });
}
