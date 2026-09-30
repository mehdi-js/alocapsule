import type { Metadata } from "next";
import Link from "next/link";

import { BannerImage } from "@/components/shop/BannerImage";
import {
  BranchCards,
  ContentPanel,
  PageHero,
  SectionTitle,
} from "@/components/shop/ContentBlocks";
import { TRUST_ICONS } from "@/components/shop/icons";
import { btnOutline, btnPrimary } from "@/components/shop/styles";
import { RichText } from "@/components/ui/RichText";
import { BANNER_SLOTS } from "@/lib/banners";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { effectiveMeta } from "@/lib/seo/title";
import { ABOUT_PAGE, SITE } from "@/lib/site-content";
import { getBanners } from "@/server/services/banner.service";
import { getFixedPage } from "@/server/services/page.service";
import { getSeoContext } from "@/server/services/seo-settings.service";
import { getSiteSettings } from "@/server/services/site-settings.service";

export async function generateMetadata(): Promise<Metadata> {
  // متن و سئو از صفحه‌ی «about» پنل (اگر منتشر شده)؛ وگرنه پیش‌فرض طراحی
  const page = await getFixedPage("about");
  return buildPageMetadata(await getSeoContext(), {
    title: page?.seoTitle || page?.title || "درباره ما",
    description:
      effectiveMeta(page?.metaDescription, page?.content) ||
      `درباره‌ی ${SITE.name}؛ تأمین، شارژ و ارسال کپسول گاز مایع (LPG) در تهران.`,
    path: "/about",
    noindex: page?.noindex,
  });
}

export default async function AboutPage() {
  const [{ aboutStats }, banners, page] = await Promise.all([
    getSiteSettings(),
    getBanners(),
    getFixedPage("about"),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 pt-4 md:gap-14 md:pt-5">
      <PageHero
        eyebrow={ABOUT_PAGE.eyebrow}
        title={[...ABOUT_PAGE.title]}
        imageLabel={`بنر درباره ${SITE.name}`}
        images={banners.images.aboutHero}
      />

      <section
        aria-labelledby="story-title"
        className="grid items-center gap-8 md:grid-cols-2 md:px-6"
      >
        <div className="flex flex-col gap-5">
          <h2
            id="story-title"
            className="text-[26px] font-extrabold md:text-[32px]"
          >
            {ABOUT_PAGE.story.title}
          </h2>
          {page?.content ? (
            <RichText
              text={page.content}
              headingLevel={3}
              className="text-ink-soft text-[15px] leading-[2.1]"
            />
          ) : (
            ABOUT_PAGE.story.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-ink-soft text-[15px] leading-[2.1]"
              >
                {paragraph}
              </p>
            ))
          )}
        </div>
        <BannerImage
          images={banners.images.aboutStory}
          alt={ABOUT_PAGE.story.title}
          placeholderSize={BANNER_SLOTS.aboutStory.desktop}
          placeholderLabel={ABOUT_PAGE.story.imageLabel}
          className="h-[260px] rounded-[22px] md:h-[380px]"
        />
      </section>

      {aboutStats.length > 0 ? (
        <ContentPanel className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {aboutStats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 text-center"
            >
              <span className="text-accent text-[30px] font-extrabold md:text-4xl">
                {stat.value}
              </span>
              <span className="text-muted text-sm">{stat.label}</span>
            </div>
          ))}
        </ContentPanel>
      ) : null}

      <section aria-labelledby="values-title" className="flex flex-col gap-6">
        <SectionTitle id="values-title">ارزش‌های ما</SectionTitle>
        <ul className="grid gap-5 md:grid-cols-3">
          {ABOUT_PAGE.values.map((value) => {
            const ValueIcon = TRUST_ICONS[value.icon];
            return (
              <li
                key={value.title}
                className="bg-card flex flex-col gap-3 rounded-[24px] border border-hair p-6"
              >
                <span className="bg-panel text-brand-strong flex size-12 items-center justify-center rounded-full">
                  <ValueIcon size={22} />
                </span>
                <h3 className="text-lg font-bold">{value.title}</h3>
                <p className="text-muted text-sm leading-[2]">{value.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="branches-title" className="flex flex-col gap-6">
        <SectionTitle id="branches-title">شعب {SITE.name}</SectionTitle>
        <BranchCards />
      </section>

      <ContentPanel className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold">{ABOUT_PAGE.cta.title}</h2>
          <p className="text-ink-soft max-w-xl text-[15px] leading-[2]">
            {ABOUT_PAGE.cta.text}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={ABOUT_PAGE.cta.href} className={btnPrimary}>
            {ABOUT_PAGE.cta.label}
          </Link>
          <Link href="/products" className={btnOutline}>
            مشاهده محصولات
          </Link>
        </div>
      </ContentPanel>
    </div>
  );
}
