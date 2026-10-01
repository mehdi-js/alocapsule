import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import {
  FeaturedProducts,
  HomeAbout,
  HomeCategories,
  HomeCta,
  HomeCustomers,
  HomeHero,
  HomeStats,
  HomeSteps,
} from "@/components/shop/HomeSections";
import { HomeSeoContent } from "@/components/shop/HomeSeoContent";
import { SearchForm } from "@/components/shop/SearchForm";
import { applyContentTokens, applyTokensToFaq } from "@/lib/content-tokens";
import {
  faqPageJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld";
import { buildHomeMetadata } from "@/lib/seo/metadata";
import { socialLinks } from "@/lib/site-settings";
import { getBanners } from "@/server/services/banner.service";
import { listFeaturedProducts } from "@/server/services/catalog.service";
import { listFeaturedCategories } from "@/server/services/catalog-page.service";
import { getContentTokenValues } from "@/server/services/content-tokens.service";
import {
  getSeoContext,
  getSeoSettings,
} from "@/server/services/seo-settings.service";
import { getSiteSettings } from "@/server/services/site-settings.service";
import {
  getBusinessSettings,
  getHomeSettings,
} from "@/server/services/store-content.service";

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
  const [
    featured,
    categories,
    banners,
    seo,
    context,
    site,
    home,
    business,
    tokens,
  ] = await Promise.all([
    listFeaturedProducts(),
    listFeaturedCategories(),
    getBanners(),
    getSeoSettings(),
    getSeoContext(),
    getSiteSettings(),
    getHomeSettings(),
    getBusinessSettings(),
    getContentTokenValues(),
  ]);
  // مقدارهای ارسال از تنظیمات جایگزین می‌شوند، نه متن ثابت (SEO.md §۱۰.۱)
  const homeContent = applyContentTokens(seo.home.content, tokens);
  const homeFaq = applyTokensToFaq(seo.home.faq, tokens);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-5 pt-4 md:gap-16 md:px-11 md:pt-6">
      <JsonLd
        data={[
          organizationJsonLd({
            siteUrl: context.siteUrl,
            brandName: seo.brandName,
            alternateNames: seo.alternateNames,
            legalName: seo.orgLegalName || null,
            logoUrl: seo.orgLogoUrl || null,
            phone: business.phone || null,
            email: site.contact.email || null,
            sameAs: profileUrls(socialLinks(site.social).map((s) => s.href)),
          }),
          websiteJsonLd({
            siteUrl: context.siteUrl,
            brandName: seo.brandName,
            alternateNames: seo.alternateNames,
          }),
          faqPageJsonLd(homeFaq),
        ]}
      />
      <SearchForm className="md:hidden" />
      <HomeHero
        h1={seo.home.h1}
        home={home}
        phone={business.phone}
        images={banners.heroSlides[0] ?? banners.images.story}
      />
      <HomeCategories categories={categories} />
      <HomeSteps home={home} />
      <FeaturedProducts title={home.featuredTitle} products={featured} />
      <HomeAbout home={home} images={banners.images.story} />
      <HomeCustomers home={home} />
      <HomeStats home={home} />
      <HomeCta home={home} phone={business.phone} />
      <HomeSeoContent content={homeContent} faq={homeFaq} />
    </div>
  );
}
