"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { FaqEditor } from "@/components/admin/seo/FaqEditor";
import { RichTextField } from "@/components/admin/seo/RichTextField";
import { type FaqRow, newFaqRow } from "@/components/admin/seo/seo-form-state";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { SeoSettings } from "@/lib/seo/settings";
import { splitKeywords } from "@/lib/validation/seo";
import { saveSeoSettingsAction } from "@/server/actions/seo";

const section = "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";

type TextKey =
  | "brandName"
  | "titleTemplate"
  | "defaultDescription"
  | "defaultOgImage"
  | "homeTitle"
  | "homeDescription"
  | "homeH1"
  | "homeContent"
  | "orgLegalName"
  | "orgLogoUrl"
  | "verificationGoogle"
  | "verificationBing";

type State = Record<TextKey, string> & {
  alternateNames: string;
  homeFaq: FaqRow[];
};

function initialState(settings: SeoSettings): State {
  return {
    brandName: settings.brandName,
    alternateNames: settings.alternateNames.join("، "),
    titleTemplate: settings.titleTemplate,
    defaultDescription: settings.defaultDescription,
    defaultOgImage: settings.defaultOgImage,
    homeTitle: settings.home.title,
    homeDescription: settings.home.description,
    homeH1: settings.home.h1,
    homeContent: settings.home.content,
    homeFaq: settings.home.faq.map((item) => newFaqRow(item)),
    orgLegalName: settings.orgLegalName,
    orgLogoUrl: settings.orgLogoUrl,
    verificationGoogle: settings.verificationGoogle,
    verificationBing: settings.verificationBing,
  };
}

/** «تنظیمات سئو» (SEO.md §۱۰.۵): برند، صفحه‌ی اصلی، سازمان و Search Console */
export function SeoSettingsForm({ settings }: { settings: SeoSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(() => initialState(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const error = (field: string) => errors[field];

  function patch(update: Partial<State>) {
    setState((current) => ({ ...current, ...update }));
  }

  function field(
    key: TextKey,
    label: string,
    options: { hint?: string; ltr?: boolean; multiline?: boolean } = {},
  ) {
    const Control = options.multiline ? Textarea : Input;
    return (
      <Field
        label={label}
        htmlFor={`seo-${key}`}
        error={error(key)}
        hint={options.hint}
      >
        <Control
          id={`seo-${key}`}
          dir={options.ltr ? "ltr" : undefined}
          value={state[key]}
          invalid={!!error(key)}
          onChange={(event) =>
            patch({ [key]: event.target.value } as Partial<State>)
          }
        />
      </Field>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveSeoSettingsAction({
        ...state,
        alternateNames: splitKeywords(state.alternateNames),
        homeFaq: state.homeFaq.map(({ question, answer }) => ({
          question,
          answer,
        })),
      });
      if (!result.ok) {
        setErrors(
          Object.fromEntries(
            Object.entries(result.fieldErrors ?? {}).map(([key, value]) => [
              key.replace(/^homeFaq\./, "faq."),
              value,
            ]),
          ),
        );
        toast.error(result.message);
        return;
      }
      toast.success("تنظیمات سئو ذخیره شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className={section}>
        <h2 className="text-lg font-bold">برند و عنوان صفحات</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("brandName", "نام برند", {
            hint: "در عنوان همه‌ی صفحات و schema می‌آید؛ یک املا (مثلاً «علی حان»).",
          })}
          <Field
            label="املاهای دیگر برند"
            htmlFor="seo-alternateNames"
            error={error("alternateNames")}
            hint="فقط در schema (alternateName)؛ با ویرگول جدا کنید."
          >
            <Input
              id="seo-alternateNames"
              value={state.alternateNames}
              onChange={(event) =>
                patch({ alternateNames: event.target.value })
              }
            />
          </Field>
          {field("titleTemplate", "قالب عنوان", {
            hint: "%s = عنوان صفحه، {brandName} = نام برند؛ مثلاً «%s | {brandName}»",
            ltr: true,
          })}
          {field("defaultOgImage", "تصویر اشتراک‌گذاری پیش‌فرض", {
            hint: "مسیر یا آدرس https تصویر ۱۲۰۰×۶۳۰؛ خالی ⇒ بدون تصویر.",
            ltr: true,
          })}
        </div>
        {field("defaultDescription", "توضیحات پیش‌فرض", {
          hint: "برای صفحاتی که توضیحات متا ندارند.",
          multiline: true,
        })}
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">صفحه‌ی اصلی</h2>
        {field("homeTitle", "عنوان کامل (با نام برند)", {
          hint: "عنوان صفحه‌ی اصلی بدون قالب نمایش داده می‌شود.",
        })}
        {field("homeDescription", "توضیحات متا", { multiline: true })}
        {field("homeH1", "تیتر اصلی (H1)", {
          hint: "متن کوچک بالای شعار اسلاید اول؛ تنها H1 صفحه‌ی اصلی.",
        })}
        <RichTextField
          id="seo-homeContent"
          label="بلوک محتوای سئو (پایین صفحه‌ی اصلی)"
          rows={16}
          value={state.homeContent}
          error={error("homeContent")}
          hint="۴۰۰ تا ۷۰۰ کلمه با سرتیتر (##) و لینک به محصولات."
          onChange={(homeContent) => patch({ homeContent })}
        />
        <FaqEditor
          rows={state.homeFaq}
          onChange={(homeFaq) => patch({ homeFaq })}
          error={error}
        />
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">سازمان و Search Console</h2>
        <p className="text-sm text-neutral-600">
          تلفن، ایمیل و شبکه‌های اجتماعی سازمان از «تنظیمات ← عمومی» خوانده
          می‌شوند.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("orgLegalName", "نام حقوقی ثبت‌شده")}
          {field("orgLogoUrl", "آدرس لوگو", { ltr: true })}
          {field("verificationGoogle", "کد تأیید Google Search Console", {
            hint: "مقدار content تگ google-site-verification (یا کل تگ را بچسبانید).",
            ltr: true,
          })}
          {field("verificationBing", "کد تأیید Bing", {
            hint: "مقدار content تگ msvalidate.01.",
            ltr: true,
          })}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Button type="submit" loading={isPending}>
          ذخیره‌ی تنظیمات سئو
        </Button>
      </div>
    </form>
  );
}
