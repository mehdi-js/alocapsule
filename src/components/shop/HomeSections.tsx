import Link from "next/link";
import type { ComponentType } from "react";

import { BANNER_SLOTS, type BannerImages, HERO_SIZES } from "@/lib/banners";
import type { HomeSettings } from "@/lib/home-settings";
import { SITE } from "@/lib/site-content";
import { phoneHref } from "@/lib/site-settings";
import { cn, toPersianDigits } from "@/lib/utils";
import type { ProductCardDto } from "@/server/services/catalog.service";
import type { FeaturedCategoryDto } from "@/server/services/catalog-page.service";

import { BannerImage } from "./BannerImage";
import {
  ArrowIcon,
  CartIcon,
  CheckIcon,
  PhoneIcon,
  ShieldIcon,
  TruckIcon,
} from "./icons";
import { ProductCard } from "./ProductCard";
import { btnOutline, btnPrimary, panel } from "./styles";

/**
 * بخش‌های صفحه‌ی اصلی الو کپسول (FORK.md §۵.۳). همه‌ی متن‌ها از `home.*` در
 * `Setting` می‌آیند و در پنل ادمین ویرایش می‌شوند؛ دسته‌ها از دیتابیس‌اند.
 */

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-2xl font-extrabold md:text-[32px]">
      {children}
    </h2>
  );
}

/** ۱) هیرو: تیتر، توضیح، دو دکمه و تصویر (جای‌نگه‌دار تا کارفرما تصویر بدهد) */
export function HomeHero({
  h1,
  home,
  phone,
  images,
}: {
  /** تنها H1 صفحه (از تنظیمات سئو)؛ متن کوچک بالای تیتر بزرگ */
  h1: string;
  home: HomeSettings;
  phone: string;
  images: BannerImages;
}) {
  return (
    <section className="bg-brand-soft grid items-center gap-8 overflow-hidden rounded-3xl p-6 md:grid-cols-[1.1fr_1fr] md:gap-10 md:p-12">
      <div className="flex flex-col gap-4 md:gap-5">
        <h1 className="text-brand-strong text-[15px] font-bold">{h1}</h1>
        <p className="text-[32px] leading-[1.3] font-extrabold md:text-[52px] md:leading-[1.2]">
          {home.heroTitle}
        </p>
        <p className="text-ink-soft max-w-[520px] text-base leading-[2] md:text-[17px]">
          {home.heroSubtitle}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href={home.heroPrimaryHref} className={btnPrimary}>
            {home.heroPrimaryCta}
            <ArrowIcon />
          </Link>
          <a href={phoneHref(phone)} className={btnOutline}>
            <PhoneIcon size={18} />
            {home.heroSecondaryCta}
            <span dir="ltr" className="text-muted text-sm font-medium">
              {toPersianDigits(phone)}
            </span>
          </a>
        </div>
      </div>
      <BannerImage
        images={images}
        alt=""
        priority
        placeholderSize={HERO_SIZES.desktop}
        placeholderLabel="تصویر هیرو"
        className="aspect-[4/3] w-full rounded-2xl md:aspect-[5/4]"
      />
    </section>
  );
}

/** ۲) دسته‌بندی‌ها: کارت‌های دسته‌های دارای پرچم `isFeatured` از دیتابیس */
export function HomeCategories({
  categories,
}: {
  categories: FeaturedCategoryDto[];
}) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-6">
      <SectionTitle id="home-categories">دسته‌بندی‌ها</SectionTitle>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={category.path}
              className={cn(
                panel,
                "hover:border-brand group flex h-full flex-col gap-3 p-5 transition",
              )}
            >
              <span className="bg-brand-soft text-brand-strong flex size-11 items-center justify-center rounded-xl">
                <ShieldIcon size={22} />
              </span>
              <span className="text-lg font-bold">{category.name}</span>
              {category.description ? (
                <span className="text-muted text-sm leading-7">
                  {category.description}
                </span>
              ) : null}
              <span className="text-brand-strong mt-auto flex items-center gap-2 text-sm font-bold">
                مشاهده‌ی {category.name}
                <ArrowIcon />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEP_ICONS: ComponentType<{ size?: number; className?: string }>[] = [
  CartIcon,
  CheckIcon,
  TruckIcon,
  ShieldIcon,
];

/** ۳) «شارژ کپسول چطور انجام می‌شود؟»: مراحل شماره‌دار با آیکون */
export function HomeSteps({ home }: { home: HomeSettings }) {
  return (
    <section aria-labelledby="home-steps" className="flex flex-col gap-6">
      <SectionTitle id="home-steps">{home.stepsTitle}</SectionTitle>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {home.steps.map((step, index) => {
          const StepIcon = STEP_ICONS[index % STEP_ICONS.length]!;
          return (
            <li
              key={`${step.title}-${index}`}
              className={cn(panel, "relative flex flex-col gap-3 p-5")}
            >
              <div className="flex items-center justify-between">
                <span className="bg-brand-strong text-on-brand flex size-9 items-center justify-center rounded-full text-base font-extrabold">
                  {toPersianDigits(index + 1)}
                </span>
                <StepIcon size={26} className="text-brand" />
              </div>
              <h3 className="text-base font-bold">{step.title}</h3>
              <p className="text-muted text-sm leading-7">{step.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** ۴) محصولات منتخب: کارت با برچسب «خدمت» و حالت «استعلام قیمت» */
export function FeaturedProducts({
  title,
  products,
}: {
  title: string;
  products: ProductCardDto[];
}) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="home-featured" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <SectionTitle id="home-featured">{title}</SectionTitle>
        <Link
          href="/products"
          className="text-brand-strong hover:text-brand-strong-hover flex items-center gap-2 text-sm font-bold transition"
        >
          مشاهده همه محصولات
          <ArrowIcon />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

/** ۵) درباره ما (خلاصه) + لینک به `/about` */
export function HomeAbout({
  home,
  images,
}: {
  home: HomeSettings;
  images: BannerImages;
}) {
  return (
    <section
      aria-labelledby="home-about"
      className={cn(panel, "grid items-center gap-8 p-5 md:grid-cols-2 md:p-8")}
    >
      <div className="flex flex-col items-start gap-4">
        <SectionTitle id="home-about">{home.aboutTitle}</SectionTitle>
        <p className="text-ink-soft text-[15px] leading-[2]">
          {home.aboutText}
        </p>
        <Link href="/about" className={btnOutline}>
          درباره‌ی {SITE.name}
          <ArrowIcon />
        </Link>
      </div>
      <BannerImage
        images={images}
        alt=""
        placeholderSize={BANNER_SLOTS.story.desktop}
        placeholderLabel="تصویر نمونه"
        className="aspect-[2/1] w-full rounded-2xl"
      />
    </section>
  );
}

/** ۶) مشتریان ما: خانگی / تجاری / صنعتی */
export function HomeCustomers({ home }: { home: HomeSettings }) {
  return (
    <section aria-labelledby="home-customers" className="flex flex-col gap-6">
      <SectionTitle id="home-customers">{home.customersTitle}</SectionTitle>
      <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
        {home.customers.map((customer) => (
          <li
            key={customer.title}
            className="bg-surface-alt border-hair flex flex-col gap-2 rounded-[18px] border p-5"
          >
            <h3 className="text-brand-strong text-lg font-extrabold">
              {customer.title}
            </h3>
            <p className="text-muted text-sm leading-7">{customer.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** ۷) آمار: فقط عددهای واقعی؛ خالی ⇒ کل بخش پنهان (عدد صفر/ساختگی نمی‌گذاریم) */
export function HomeStats({ home }: { home: HomeSettings }) {
  if (home.stats.length === 0) return null;
  return (
    <section
      aria-label="آمار"
      className="bg-brand-soft grid grid-cols-2 gap-6 rounded-3xl p-6 md:grid-cols-4 md:p-8"
    >
      {home.stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center gap-1 text-center"
        >
          <span className="text-brand-strong text-[30px] font-extrabold md:text-4xl">
            {stat.value}
          </span>
          <span className="text-muted text-sm">{stat.label}</span>
        </div>
      ))}
    </section>
  );
}

/** ۸) دعوت پایانی به تماس: شماره و دکمه‌ی تماس */
export function HomeCta({
  home,
  phone,
}: {
  home: HomeSettings;
  phone: string;
}) {
  return (
    <section
      aria-labelledby="home-cta"
      className="bg-ink text-on-media flex flex-col items-start gap-4 rounded-3xl p-7 md:flex-row md:items-center md:justify-between md:p-10"
    >
      <div className="flex max-w-[620px] flex-col gap-2">
        <h2 id="home-cta" className="text-2xl font-extrabold md:text-[32px]">
          {home.ctaTitle}
        </h2>
        <p className="text-on-media/80 text-[15px] leading-8">{home.ctaText}</p>
      </div>
      <a href={phoneHref(phone)} className={cn(btnPrimary, "shrink-0 text-lg")}>
        <PhoneIcon size={20} />
        <span dir="ltr">{toPersianDigits(phone)}</span>
      </a>
    </section>
  );
}
