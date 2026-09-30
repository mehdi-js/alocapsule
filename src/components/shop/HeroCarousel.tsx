"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { HERO_SIZES, type HeroSlideSetting } from "@/lib/banners";
import { cn, toPersianDigits } from "@/lib/utils";

import { BannerImage } from "./BannerImage";
import { ArrowIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { btnDeep, carouselButton } from "./styles";

const AUTOPLAY_MS = 6000;

function Ornaments() {
  return (
    <svg
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden
      className="pointer-events-none absolute -top-16 -end-[70px] hidden size-[420px] opacity-60 md:block"
    >
      <circle
        cx="210"
        cy="210"
        r="180"
        stroke="#2FA84F"
        strokeWidth="1.3"
        strokeDasharray="300 700"
      />
      <circle
        cx="210"
        cy="210"
        r="140"
        stroke="#C9A876"
        strokeWidth="1"
        strokeDasharray="170 700"
      />
    </svg>
  );
}

/**
 * اسلایدر صفحه‌ی اصلی؛ متن و تصاویر (دسکتاپ/موبایل) از پنل مدیریت.
 *
 * سئو (SEO.md §۵.۲): تنها H1 صفحه متن کوچک بالای شعار **اسلاید اول** است
 * (`h1` از تنظیمات سئو، مثل «خرید باقلوای ترکی علی حان»). شعار بزرگ `<p>`
 * با ظاهر تیتر است و متن اسلایدهای بعدی تیتر نیست.
 */
export function HeroCarousel({
  slides,
  h1,
}: {
  slides: HeroSlideSetting[];
  h1: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const regionRef = useRef<HTMLElement>(null);

  const go = useCallback(
    (delta: number) =>
      setActive((current) => (current + delta + total) % total),
    [total],
  );

  useEffect(() => {
    if (paused || total < 2) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;
    const timer = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [go, paused, total]);

  const slide = slides[active];
  if (!slide) return null;

  return (
    <section
      ref={regionRef}
      aria-roledescription="carousel"
      aria-label="معرفی محصولات"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        // در RTL جهت پیکان‌ها برعکس است
        if (event.key === "ArrowRight") go(-1);
        if (event.key === "ArrowLeft") go(1);
      }}
      className="relative flex h-[290px] items-end overflow-hidden rounded-[18px] md:h-[520px] md:items-center"
    >
      {/* همه‌ی اسلایدها روی هم؛ فقط فعال دیده می‌شود (بدون پرش هنگام تعویض) */}
      {slides.map((item, index) => (
        <BannerImage
          key={item.id}
          images={item}
          alt={item.title.replace(/\n/g, " ")}
          placeholderLabel={`اسلاید ${toPersianDigits(index + 1)}`}
          placeholderSize={HERO_SIZES.desktop}
          priority={index === 0}
          // در موبایل برچسب جای‌نگه‌دار بالای کادر است تا زیر متن نرود
          placeholderClassName="justify-start pt-6 md:justify-center md:pt-0"
          className={cn(
            "absolute inset-0 rounded-[18px] transition-opacity duration-700",
            index === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {/* پوشش گرادیانی: دسکتاپ از راست، موبایل از پایین */}
      <div className="absolute inset-0 hidden bg-[linear-gradient(270deg,rgba(7,16,9,.97)_6%,rgba(7,16,9,.86)_34%,rgba(7,16,9,.1)_66%)] md:block" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,16,9,.97)_12%,rgba(7,16,9,.7)_46%,transparent_78%)] md:hidden" />
      <Ornaments />

      <div
        key={active}
        className="relative flex max-w-[640px] flex-col gap-3 p-5 md:me-auto md:gap-5.5 md:p-14"
      >
        {active === 0 ? (
          <h1 className="text-action flex items-center gap-2.5 text-[15px] font-normal">
            {h1}
            <ArrowIcon className="hidden md:block" />
          </h1>
        ) : slide.eyebrow ? (
          <p className="text-action flex items-center gap-2.5 text-[15px]">
            {slide.eyebrow}
            <ArrowIcon className="hidden md:block" />
          </p>
        ) : null}
        <p className="text-3xl leading-[1.25] font-extrabold md:text-[64px] md:leading-[1.16] md:tracking-[-0.02em]">
          {slide.title.split("\n").map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
        {slide.subtitle ? (
          <p className="text-ink-2 hidden max-w-[430px] text-[17px] leading-[2] md:block">
            {slide.subtitle}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Link
            href={slide.ctaHref}
            className={cn(
              btnDeep,
              "whitespace-nowrap max-md:bg-action max-md:text-action-ink max-md:py-3 max-md:ps-5 max-md:pe-4",
            )}
          >
            {slide.ctaLabel}
            <span className="hidden size-8 items-center justify-center rounded-full bg-[rgb(245_240_232/0.14)] md:flex">
              <ChevronLeftIcon size={16} />
            </span>
            <ArrowIcon className="md:hidden" />
          </Link>
          {total > 1 ? (
            <div className="flex items-center gap-2 md:hidden">
              <CarouselControls onPrev={() => go(-1)} onNext={() => go(1)} />
            </div>
          ) : null}
        </div>
      </div>

      {total > 1 ? (
        <div className="absolute bottom-6 end-6 hidden items-center gap-3 md:flex">
          <span dir="ltr" className="text-ink-2 font-mono text-[13px]">
            {toPersianDigits(String(active + 1).padStart(2, "0"))} /{" "}
            {toPersianDigits(String(total).padStart(2, "0"))}
          </span>
          <CarouselControls onPrev={() => go(-1)} onNext={() => go(1)} />
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        اسلاید {toPersianDigits(active + 1)} از {toPersianDigits(total)}
      </span>
    </section>
  );
}

function CarouselControls({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onNext}
        aria-label="اسلاید بعدی"
        className={carouselButton}
      >
        <ChevronLeftIcon size={15} />
      </button>
      <button
        type="button"
        onClick={onPrev}
        aria-label="اسلاید قبلی"
        className={carouselButton}
      >
        <ChevronRightIcon size={15} />
      </button>
    </>
  );
}
