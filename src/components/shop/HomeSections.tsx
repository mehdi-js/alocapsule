import Link from "next/link";

import { BANNER_SLOTS, type BannerImages } from "@/lib/banners";
import { BRAND_STORY, PROMO_BANNER } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import type { ProductCardDto } from "@/server/services/catalog.service";

import { BannerImage } from "./BannerImage";
import { ArrowIcon, ChevronLeftIcon } from "./icons";
import { ProductCard } from "./ProductCard";
import { btnDeep, btnOutline, panel } from "./styles";

/** ردیف «محصولات پرطرفدار» (ترتیب = sortOrder که ادمین تنظیم می‌کند) */
export function PopularProducts({ products }: { products: ProductCardDto[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="popular-title"
      // موبایل بدون پنل (طبق طراحی)، دسکتاپ داخل پنل
      className="md:bg-panel md:rounded-[22px] md:border md:border-hair md:p-7"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2
          id="popular-title"
          className="text-2xl font-extrabold md:text-[34px]"
        >
          محصولات پرطرفدار
        </h2>
        <Link
          href="/products"
          className="text-accent hover:text-accent-hover flex items-center gap-2.5 text-sm transition md:text-[15px]"
        >
          <span className="md:hidden">همه</span>
          <span className="hidden md:inline">مشاهده همه محصولات</span>
          <ArrowIcon className="hidden md:block" />
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

/**
 * «داستان برند». دکمه‌ی «ویدیو معرفی برند» طراحی ساخته نشده، چون هنوز
 * ویدیویی وجود ندارد (دکمه‌ی بی‌عمل نمی‌گذاریم).
 */
export function BrandStory({ images }: { images: BannerImages }) {
  return (
    <section
      aria-labelledby="story-title"
      className={cn(panel, "grid items-center gap-8 p-5 md:grid-cols-2 md:p-6")}
    >
      <BannerImage
        images={images}
        alt={BRAND_STORY.title}
        placeholderSize={BANNER_SLOTS.story.desktop}
        placeholderLabel={BRAND_STORY.imageLabel}
        className="h-[240px] rounded-[18px] md:h-[340px]"
      />
      <div className="flex flex-col items-start gap-5 md:pe-6">
        <p className="text-accent flex items-center gap-2.5 text-sm">
          {BRAND_STORY.eyebrow}
          <span aria-hidden className="bg-accent h-px w-8" />
        </p>
        <h2
          id="story-title"
          className="text-[28px] font-extrabold md:text-[34px]"
        >
          {BRAND_STORY.title}
        </h2>
        <p className="text-ink-soft text-[15px] leading-[2.1]">
          {BRAND_STORY.text}
        </p>
        <Link href={BRAND_STORY.cta.href} className={btnOutline}>
          {BRAND_STORY.cta.label}
          <ArrowIcon className="text-accent" />
        </Link>
      </div>
    </section>
  );
}

export function PromoBanner({ images }: { images: BannerImages }) {
  return (
    <section
      aria-labelledby="promo-title"
      className="relative flex min-h-[320px] items-end overflow-hidden rounded-[18px] md:h-[360px] md:items-center"
    >
      <BannerImage
        images={images}
        alt=""
        placeholderSize={BANNER_SLOTS.promo.desktop}
        placeholderLabel={PROMO_BANNER.imageLabel}
        className="absolute inset-0 rounded-[18px]"
      />
      <div className="absolute inset-0 hidden bg-scrim-side md:block" />
      <div className="absolute inset-0 bg-scrim-bottom md:hidden" />
      <div className="relative flex max-w-[600px] flex-col items-start gap-4 p-6 md:me-auto md:p-14">
        <p className="text-accent text-sm">{PROMO_BANNER.eyebrow}</p>
        <h2
          id="promo-title"
          className="text-[28px] leading-[1.35] font-extrabold md:text-[42px]"
        >
          {PROMO_BANNER.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <p className="text-ink-soft text-[15px]">{PROMO_BANNER.text}</p>
        <Link href={PROMO_BANNER.cta.href} className={btnDeep}>
          {PROMO_BANNER.cta.label}
          <span className="flex size-8 items-center justify-center rounded-full bg-on-media/14">
            <ChevronLeftIcon size={16} />
          </span>
        </Link>
      </div>
    </section>
  );
}
