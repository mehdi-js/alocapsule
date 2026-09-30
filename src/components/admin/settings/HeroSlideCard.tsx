"use client";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { HERO_SIZES, type HeroSlideSetting } from "@/lib/banners";
import { toPersianDigits } from "@/lib/utils";

import { BannerImagePicker } from "./BannerImagePicker";

/** یک اسلاید صفحه‌ی اصلی: تصاویر دسکتاپ/موبایل + متن‌ها + دکمه */
export function HeroSlideCard({
  slide,
  index,
  total,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  slide: HeroSlideSetting;
  index: number;
  total: number;
  errors: Record<string, string>;
  onChange: (slide: HeroSlideSetting) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = (field: string) => `slide-${slide.id}-${field}`;
  const err = (field: string) => errors[`heroSlides.${index}.${field}`];
  const set = (patch: Partial<HeroSlideSetting>) =>
    onChange({ ...slide, ...patch });

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">اسلاید {toPersianDigits(index + 1)}</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="انتقال به قبل"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="انتقال به بعد"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            disabled={total === 1}
            onClick={onRemove}
          >
            حذف اسلاید
          </Button>
        </div>
      </div>

      <BannerImagePicker
        images={slide}
        sizes={HERO_SIZES}
        onChange={(images) => set(images)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="عنوان (هر خط یک سطر، حداکثر ۲ خط)"
          htmlFor={id("title")}
          error={err("title")}
          required
        >
          <Textarea
            id={id("title")}
            rows={2}
            value={slide.title}
            invalid={Boolean(err("title"))}
            onChange={(event) => set({ title: event.target.value })}
          />
        </Field>
        <Field
          label="زیرعنوان (فقط دسکتاپ)"
          htmlFor={id("subtitle")}
          error={err("subtitle")}
        >
          <Textarea
            id={id("subtitle")}
            rows={2}
            value={slide.subtitle}
            invalid={Boolean(err("subtitle"))}
            onChange={(event) => set({ subtitle: event.target.value })}
          />
        </Field>
        <Field
          label="متن کوچک بالای عنوان (اختیاری)"
          htmlFor={id("eyebrow")}
          error={err("eyebrow")}
          hint={
            index === 0
              ? "در اسلاید اول به‌جای این متن، «تیتر اصلی (H1)» از تنظیمات سئو نمایش داده می‌شود."
              : undefined
          }
        >
          <Input
            id={id("eyebrow")}
            value={slide.eyebrow}
            invalid={Boolean(err("eyebrow"))}
            onChange={(event) => set({ eyebrow: event.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="متن دکمه"
            htmlFor={id("ctaLabel")}
            error={err("ctaLabel")}
            required
          >
            <Input
              id={id("ctaLabel")}
              value={slide.ctaLabel}
              invalid={Boolean(err("ctaLabel"))}
              onChange={(event) => set({ ctaLabel: event.target.value })}
            />
          </Field>
          <Field
            label="لینک دکمه"
            htmlFor={id("ctaHref")}
            error={err("ctaHref")}
            required
          >
            <Input
              id={id("ctaHref")}
              dir="ltr"
              value={slide.ctaHref}
              placeholder="/products"
              invalid={Boolean(err("ctaHref"))}
              onChange={(event) => set({ ctaHref: event.target.value })}
            />
          </Field>
        </div>
      </div>
    </section>
  );
}
