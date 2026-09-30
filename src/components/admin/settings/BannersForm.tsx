"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  BANNER_SLOT_KEYS,
  BANNER_SLOTS,
  type BannersSettings,
  HERO_SIZES,
  MAX_HERO_SLIDES,
} from "@/lib/banners";
import { toPersianDigits } from "@/lib/utils";
import { saveBannersAction } from "@/server/actions/settings";

import { BannerImagePicker } from "./BannerImagePicker";
import { HeroSlideCard } from "./HeroSlideCard";
import { Section } from "./SettingsSections";

function newSlideId(): string {
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * اسلایدر صفحه‌ی اصلی (متن + تصاویر) و تصاویر بنرهای دیگر. تصاویر بلافاصله
 * آپلود می‌شوند ولی تا «ذخیره» روی سایت نمی‌روند.
 */
export function BannersForm({ initial }: { initial: BannersSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const slides = state.heroSlides;

  function setSlides(heroSlides: BannersSettings["heroSlides"]) {
    setState((current) => ({ ...current, heroSlides }));
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...slides];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    setSlides(next);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveBannersAction(state);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      toast.success("بنرها و اسلایدر ذخیره شد و روی سایت اعمال شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Section
        title="اسلایدر صفحه‌ی اصلی"
        hint={`حداکثر ${toPersianDigits(MAX_HERO_SLIDES)} اسلاید. ${HERO_SIZES.tip}`}
      >
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <HeroSlideCard
              key={slide.id}
              slide={slide}
              index={index}
              total={slides.length}
              errors={errors}
              onChange={(next) =>
                setSlides(slides.map((s, i) => (i === index ? next : s)))
              }
              onMove={(delta) => move(index, delta)}
              onRemove={() => setSlides(slides.filter((_, i) => i !== index))}
            />
          ))}
          {slides.length < MAX_HERO_SLIDES ? (
            <Button
              variant="secondary"
              onClick={() =>
                setSlides([
                  ...slides,
                  {
                    id: newSlideId(),
                    eyebrow: "",
                    title: "",
                    subtitle: "",
                    ctaLabel: "مشاهده محصولات",
                    ctaHref: "/products",
                    desktop: null,
                    mobile: null,
                  },
                ])
              }
            >
              + اسلاید جدید
            </Button>
          ) : null}
          {errors.heroSlides ? (
            <p className="text-sm text-red-600">{errors.heroSlides}</p>
          ) : null}
        </div>
      </Section>

      <Section
        title="بنرهای دیگر"
        hint="متن این بنرها ثابت است؛ فقط تصویرشان این‌جا عوض می‌شود. بدون تصویر ⇒ کادر خاکستری جای‌نگه‌دار."
      >
        <div className="space-y-6">
          {BANNER_SLOT_KEYS.map((slot) => {
            const info = BANNER_SLOTS[slot];
            return (
              <div
                key={slot}
                className="space-y-3 border-b border-neutral-100 pb-6 last:border-0 last:pb-0"
              >
                <div>
                  <h3 className="font-bold">{info.label}</h3>
                  <p className="text-xs leading-6 text-neutral-500">
                    {info.where} — {info.tip}
                  </p>
                </div>
                <BannerImagePicker
                  images={state.images[slot]}
                  sizes={info}
                  onChange={(images) =>
                    setState((current) => ({
                      ...current,
                      images: { ...current.images, [slot]: images },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" loading={pending} className="shadow-lg">
          ذخیره‌ی بنرها و اسلایدر
        </Button>
      </div>
    </form>
  );
}
