import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { HeroCarousel } from "@/components/shop/HeroCarousel";
import {
  BrandStory,
  PopularProducts,
  PromoBanner,
} from "@/components/shop/HomeSections";
import { HomeSeoContent } from "@/components/shop/HomeSeoContent";
import { SearchForm } from "@/components/shop/SearchForm";
import { TrustBar } from "@/components/shop/TrustBar";
import {
  faqPageJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld";
import { buildHomeMetadata } from "@/lib/seo/metadata";
import { socialLinks } from "@/lib/site-settings";
import { getBanners } from "@/server/services/banner.service";
import { listFeaturedProducts } from "@/server/services/catalog.service";
import {
  getSeoContext,
  getSeoSettings,
} from "@/server/services/seo-settings.service";
import { getSiteSettings } from "@/server/services/site-settings.service";

/** بازسازی دوره‌ای؛ تغییر محصول در ادمین هم با revalidatePath فوراً اعمال می‌شود. */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [context, seo] = await Promise.all([getSeoContext(), getSeoSettings()]);
  return buildHomeMetadata(context, seo.home);
}

/** آدرس شبکه‌ی اجتماعی فقط اگر به صفحه‌ی مشخصی اشاره کند (نه دامنه‌ی خالی) */
function profileUrls(hrefs: string[]): string[] {
  return hrefs.filter((href) => {
    try {
      return new URL(href).pathname.replace(/\/+$/, "") !== "";
    } catch {
      return false;
    }
  });
}

export default async function HomePage() {
  const [featured, banners, seo, context, site] = await Promise.all([
    listFeaturedProducts(),
    getBanners(),
    getSeoSettings(),
    getSeoContext(),
    getSiteSettings(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 pt-4 md:gap-12 md:px-5 md:pt-5">
      <JsonLd
        data={[
          organizationJsonLd({
            siteUrl: context.siteUrl,
            brandName: seo.brandName,
            alternateNames: seo.alternateNames,
            legalName: seo.orgLegalName || null,
            logoUrl: seo.orgLogoUrl || null,
            phone: site.contact.phone || null,
            email: site.contact.email || null,
            sameAs: profileUrls(socialLinks(site.social).map((s) => s.href)),
          }),
          websiteJsonLd({
            siteUrl: context.siteUrl,
            brandName: seo.brandName,
            alternateNames: seo.alternateNames,
          }),
          faqPageJsonLd(seo.home.faq),
        ]}
      />
      <SearchForm className="md:hidden" />
      {banners.heroSlides.length > 0 ? (
        <HeroCarousel slides={banners.heroSlides} h1={seo.home.h1} />
      ) : (
        <h1 className="text-2xl font-extrabold">{seo.home.h1}</h1>
      )}
      <TrustBar />
      <PopularProducts products={featured} />
      <BrandStory images={banners.images.story} />
      <PromoBanner images={banners.images.promo} />
      <HomeSeoContent content={seo.home.content} faq={seo.home.faq} />
    </div>
  );
}
