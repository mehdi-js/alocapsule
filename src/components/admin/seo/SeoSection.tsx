"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { SEO_LIMITS } from "@/lib/seo/analyze";
import type { SeoEntityKind } from "@/lib/seo/conflicts";
import {
  autoMetaDescription,
  buildDocumentTitle,
  effectiveMeta,
  effectiveTitle,
  type TitleSettings,
} from "@/lib/seo/title";

import { CharCount } from "./CharCount";
import { FaqEditor } from "./FaqEditor";
import type { SeoFormState } from "./seo-form-state";
import { SeoAnalysisPanel } from "./SeoAnalysisPanel";
import { SerpPreview } from "./SerpPreview";

export interface SeoContext {
  kind: SeoEntityKind;
  /** `null` ⇒ رکورد جدید */
  id: string | null;
  name: string;
  /** مسیر صفحه، مثل `/products/example-product` */
  path: string;
  /** متن اصلی صفحه (rich text) برای متای خودکار و تحلیل */
  text: string;
  /** `null` ⇒ صفحه تصویر ندارد (دسته) */
  images: { alt: string; isPrimary: boolean }[] | null;
  titleSettings: TitleSettings;
  siteUrl: string;
}

/**
 * بخش سئوی فرم محصول و دسته (SEO.md §۱۰.۱): فیلدها با شمارنده، پیش‌نمایش
 * گوگل، تولید متای پیش‌فرض، FAQ و تحلیلگر.
 */
export function SeoSection({
  state,
  onChange,
  error,
  context,
  children,
}: {
  state: SeoFormState;
  onChange: (update: Partial<SeoFormState>) => void;
  error: (field: string) => string | undefined;
  context: SeoContext;
  /** فیلدهای اضافه‌ی مخصوص هر فرم (مثل canonical محصول) */
  children?: ReactNode;
}) {
  const toast = useToast();
  const fullTitle = buildDocumentTitle(
    effectiveTitle(state.seoTitle, context.name),
    context.titleSettings,
  );
  const autoMeta = autoMetaDescription(context.text);

  function generateMeta() {
    if (!autoMeta) {
      toast.error("اول متن صفحه را بنویسید تا متا از آن ساخته شود.");
      return;
    }
    onChange({ metaDescription: autoMeta });
    toast.success("متای پیشنهادی در فیلد قرار گرفت؛ بازبینی و ذخیره کنید.");
  }

  return (
    <section className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-bold">سئو</h2>
        <p className="text-sm text-neutral-600">
          عنوان را بدون نام برند بنویسید؛ « | {context.titleSettings.brandName}»
          خودکار اضافه می‌شود.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field
            label="کلمه‌ی کانونی"
            htmlFor="focusKeyword"
            error={error("focusKeyword")}
            hint="عبارتی که مشتری در گوگل جستجو می‌کند؛ فقط برای تحلیل است و در صفحه نمی‌آید."
          >
            <Input
              id="focusKeyword"
              value={state.focusKeyword}
              invalid={!!error("focusKeyword")}
              onChange={(event) =>
                onChange({ focusKeyword: event.target.value })
              }
            />
          </Field>
          <Field
            label="کلمات ثانویه"
            htmlFor="secondaryKeywords"
            error={error("secondaryKeywords")}
            hint="با ویرگول جدا کنید؛ مثلاً: عبارت اول، عبارت دوم"
          >
            <Input
              id="secondaryKeywords"
              value={state.secondaryKeywords}
              invalid={!!error("secondaryKeywords")}
              onChange={(event) =>
                onChange({ secondaryKeywords: event.target.value })
              }
            />
          </Field>
          <div className="space-y-1">
            <Field
              label="عنوان سئو"
              htmlFor="seoTitle"
              error={error("seoTitle")}
            >
              <Input
                id="seoTitle"
                value={state.seoTitle}
                placeholder={context.name}
                invalid={!!error("seoTitle")}
                onChange={(event) => onChange({ seoTitle: event.target.value })}
              />
            </Field>
            <CharCount
              value={fullTitle}
              min={SEO_LIMITS.titleMin}
              max={SEO_LIMITS.titleMax}
              suffix="(عنوان کامل با برند)"
            />
          </div>
          <div className="space-y-1">
            <Field
              label="توضیحات متا"
              htmlFor="metaDescription"
              error={error("metaDescription")}
            >
              <Textarea
                id="metaDescription"
                rows={3}
                value={state.metaDescription}
                invalid={!!error("metaDescription")}
                onChange={(event) =>
                  onChange({ metaDescription: event.target.value })
                }
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CharCount
                value={state.metaDescription}
                min={SEO_LIMITS.metaMin}
                max={SEO_LIMITS.metaMax}
              />
              <Button variant="ghost" size="sm" onClick={generateMeta}>
                تولید متای پیش‌فرض از توضیحات
              </Button>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 text-sm">
            <span>
              <span className="font-medium">عدم نمایش در گوگل (noindex)</span>
              <span className="block text-xs text-neutral-500">
                فقط برای صفحه‌ای که نباید در نتایج جستجو باشد.
              </span>
            </span>
            <Switch
              checked={state.noindex}
              label="عدم نمایش در گوگل"
              onChange={(noindex) => onChange({ noindex })}
            />
          </label>
          {children}
        </div>

        <div className="space-y-4">
          <SerpPreview
            title={fullTitle}
            url={new URL(context.path, context.siteUrl).toString()}
            description={effectiveMeta(state.metaDescription, context.text)}
            autoDescription={!state.metaDescription.trim()}
          />
          <SeoAnalysisPanel
            kind={context.kind}
            id={context.id}
            input={{
              name: context.name,
              seoTitle: state.seoTitle || null,
              metaDescription: state.metaDescription || null,
              focusKeyword: state.focusKeyword || null,
              text: context.text,
              images: context.images,
              noindex: state.noindex,
              titleSettings: context.titleSettings,
            }}
          />
        </div>
      </div>

      <FaqEditor
        rows={state.faq}
        onChange={(faq) => onChange({ faq })}
        error={error}
      />
    </section>
  );
}
