"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { CharCount } from "@/components/admin/seo/CharCount";
import { FaqEditor } from "@/components/admin/seo/FaqEditor";
import { RichTextField } from "@/components/admin/seo/RichTextField";
import { type FaqRow, newFaqRow } from "@/components/admin/seo/seo-form-state";
import { SlugField } from "@/components/admin/seo/SlugField";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { SEO_LIMITS } from "@/lib/seo/analyze";
import { deletePageAction, savePageAction } from "@/server/actions/content";
import type { PageDto } from "@/server/services/page.service";

const section = "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";

interface State {
  title: string;
  slug: string;
  content: string;
  seoTitle: string;
  metaDescription: string;
  noindex: boolean;
  isPublished: boolean;
  faq: FaqRow[];
}

function initialState(page: PageDto | null): State {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    content: page?.content ?? "",
    seoTitle: page?.seoTitle ?? "",
    metaDescription: page?.metaDescription ?? "",
    noindex: page?.noindex ?? false,
    isPublished: page?.isPublished ?? false,
    faq: (page?.faq ?? []).map((item) => newFaqRow(item)),
  };
}

/**
 * فرم صفحه‌ی ثابت. «درباره ما» و «تماس» نامک ثابت دارند؛ متنشان جای بخش
 * داستان/معرفی طراحی می‌نشیند.
 */
export function PageForm({
  page,
  fixed,
}: {
  page: PageDto | null;
  /** «درباره ما»/«تماس»: نامک قفل و بدون حذف */
  fixed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState(() => initialState(page));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const error = (field: string) => errors[field];

  function patch(update: Partial<State>) {
    setState((current) => ({ ...current, ...update }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await savePageAction(page?.id ?? null, {
        ...state,
        faq: state.faq.map(({ question, answer }) => ({ question, answer })),
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(page ? "صفحه ذخیره شد." : "صفحه ساخته شد.");
      router.push("/admin/pages");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!page) return;
    startTransition(async () => {
      const result = await deletePageAction(page.id);
      setConfirming(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("صفحه حذف شد و آدرسش به صفحه‌ی اصلی ریدایرکت می‌شود.");
      router.push("/admin/pages");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className={section}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="عنوان (H1)"
            htmlFor="page-title"
            error={error("title")}
            required
          >
            <Input
              id="page-title"
              value={state.title}
              invalid={!!error("title")}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
          {fixed ? (
            <Field
              label="نامک"
              htmlFor="page-slug"
              hint="این صفحه طراحی اختصاصی دارد و نامکش ثابت است."
            >
              <Input id="page-slug" dir="ltr" value={state.slug} disabled />
            </Field>
          ) : (
            <SlugField
              value={state.slug}
              originalSlug={page?.slug ?? null}
              pathPrefix="/"
              example="shipping"
              error={error("slug")}
              onChange={(slug) => patch({ slug })}
            />
          )}
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          منتشر شده (نمایش در سایت و فوتر)
          <Switch
            checked={state.isPublished}
            label="منتشر شدن صفحه"
            onChange={(isPublished) => patch({ isPublished })}
          />
        </label>
        <RichTextField
          id="page-content"
          label={fixed ? "متن صفحه (جای متن پیش‌فرض طراحی)" : "متن صفحه"}
          rows={18}
          value={state.content}
          error={error("content")}
          hint="متن‌های {{تکمیل توسط الو کپسول…}} را قبل از انتشار با اطلاعات واقعی جایگزین کنید."
          onChange={(content) => patch({ content })}
        />
        <FaqEditor
          rows={state.faq}
          onChange={(faq) => patch({ faq })}
          error={error}
        />
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">سئو</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="عنوان سئو"
            htmlFor="page-seoTitle"
            error={error("seoTitle")}
            hint="بدون نام برند؛ خالی ⇒ عنوان صفحه"
          >
            <Input
              id="page-seoTitle"
              value={state.seoTitle}
              invalid={!!error("seoTitle")}
              onChange={(event) => patch({ seoTitle: event.target.value })}
            />
          </Field>
          <div className="space-y-1">
            <Field
              label="توضیحات متا"
              htmlFor="page-meta"
              error={error("metaDescription")}
            >
              <Textarea
                id="page-meta"
                rows={3}
                value={state.metaDescription}
                invalid={!!error("metaDescription")}
                onChange={(event) =>
                  patch({ metaDescription: event.target.value })
                }
              />
            </Field>
            <CharCount
              value={state.metaDescription}
              min={SEO_LIMITS.metaMin}
              max={SEO_LIMITS.metaMax}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          عدم نمایش در گوگل (noindex)
          <Switch
            checked={state.noindex}
            label="عدم نمایش در گوگل"
            onChange={(noindex) => patch({ noindex })}
          />
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-between gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <div>
          {page && !fixed ? (
            <Button
              variant="ghost"
              className="text-red-600"
              onClick={() => setConfirming(true)}
            >
              حذف صفحه
            </Button>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Link href="/admin/pages" className={buttonClasses("secondary")}>
            انصراف
          </Link>
          <Button type="submit" loading={isPending}>
            {page ? "ذخیره‌ی تغییرات" : "ساخت صفحه"}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        destructive
        loading={isPending}
        title="حذف صفحه"
        confirmLabel="حذف"
        description={
          <>
            صفحه‌ی «{state.title}» حذف شود؟ آدرسش به صفحه‌ی اصلی ریدایرکت
            می‌شود.
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
