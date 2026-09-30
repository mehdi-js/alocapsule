"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import type { TitleSettings } from "@/lib/seo/title";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/server/actions/category";
import type {
  CategoryDto,
  CategoryEditDto,
} from "@/server/services/category.service";

import {
  categoryFormFrom,
  type CategoryFormState,
  categoryText,
  descendantIds,
  toCategoryInput,
} from "./category-form-state";
import { RichTextField } from "./seo/RichTextField";
import { SeoSection } from "./seo/SeoSection";
import { SlugField } from "./seo/SlugField";

const sectionClass =
  "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";

/** فرم کامل دسته (اطلاعات، متن صفحه و سئو) — SEO.md §۶.۳ و §۱۰.۱ */
export function CategoryForm({
  category,
  categories,
  titleSettings,
  siteUrl,
}: {
  /** `null` ⇒ دسته‌ی جدید */
  category: CategoryEditDto | null;
  categories: CategoryDto[];
  titleSettings: TitleSettings;
  siteUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(() => categoryFormFrom(category));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const error = (field: string) => errors[field];

  function patch(update: Partial<CategoryFormState>) {
    setState((current) => ({ ...current, ...update }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const input = toCategoryInput(state);
      const result = category
        ? await updateCategoryAction(category.id, input)
        : await createCategoryAction(input);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      if (result.seoWarning) toast.error(result.seoWarning);
      toast.success(category ? "تغییرات ذخیره شد." : "دسته‌بندی ساخته شد.");
      router.push("/admin/categories");
      router.refresh();
    });
  }

  const blocked = category
    ? new Set([category.id, ...descendantIds(categories, category.id)])
    : new Set<string>();

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className={sectionClass}>
        <h2 className="text-lg font-bold">اطلاعات اصلی</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="نام (H1)"
            htmlFor="cat-name"
            error={error("name")}
            required
          >
            <Input
              id="cat-name"
              value={state.name}
              invalid={!!error("name")}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Field>
          <Field
            label="H1 صفحه (اختیاری)"
            htmlFor="cat-h1"
            error={error("h1")}
            hint="اگر با نام دسته فرق دارد (مثلاً «قیمت شارژ کپسول گاز»)؛ خالی ⇒ نام دسته."
          >
            <Input
              id="cat-h1"
              value={state.h1}
              invalid={!!error("h1")}
              onChange={(event) => patch({ h1: event.target.value })}
            />
          </Field>
          <SlugField
            value={state.slug}
            originalSlug={category?.slug ?? null}
            pathPrefix="/category/"
            example="example-category"
            error={error("slug")}
            onChange={(slug) => patch({ slug })}
          />
          <Field
            label="دسته‌ی والد"
            htmlFor="cat-parent"
            error={error("parentId")}
          >
            <Select
              id="cat-parent"
              value={state.parentId}
              onChange={(event) => patch({ parentId: event.target.value })}
            >
              <option value="">بدون والد (دسته‌ی اصلی)</option>
              {categories
                .filter((option) => !blocked.has(option.id))
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {"— ".repeat(option.depth)}
                    {option.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field
            label="ترتیب نمایش"
            htmlFor="cat-sort"
            error={error("sortOrder")}
          >
            <Input
              id="cat-sort"
              dir="ltr"
              inputMode="numeric"
              value={state.sortOrder}
              invalid={!!error("sortOrder")}
              onChange={(event) => patch({ sortOrder: event.target.value })}
            />
          </Field>
        </div>
        <Field
          label="زیرعنوان"
          htmlFor="cat-description"
          error={error("description")}
          hint="یک جمله‌ی کوتاه زیر نام دسته."
        >
          <Input
            id="cat-description"
            value={state.description}
            invalid={!!error("description")}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          فعال
          <Switch
            checked={state.isActive}
            label="فعال بودن دسته‌بندی"
            onChange={(isActive) => patch({ isActive })}
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          نمایش در صفحه‌ی اصلی
          <Switch
            checked={state.isFeatured}
            label="نمایش دسته در بخش دسته‌های صفحه‌ی اصلی"
            onChange={(isFeatured) => patch({ isFeatured })}
          />
        </label>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-bold">متن صفحه</h2>
        <Field
          label="متن معرفی (بالای محصولات)"
          htmlFor="cat-intro"
          error={error("introText")}
          hint="یک پاراگراف ۴۰ تا ۶۰ کلمه‌ای."
        >
          <Textarea
            id="cat-intro"
            rows={4}
            value={state.introText}
            invalid={!!error("introText")}
            onChange={(event) => patch({ introText: event.target.value })}
          />
        </Field>
        <RichTextField
          id="cat-bottom"
          label="متن پایین صفحه (زیر محصولات)"
          rows={14}
          value={state.bottomContent}
          error={error("bottomContent")}
          hint="۲۰۰ تا ۳۰۰ کلمه با دو سرتیتر (##) و لینک به محصولات."
          onChange={(bottomContent) => patch({ bottomContent })}
        />
      </section>

      <SeoSection
        state={state.seo}
        onChange={(update) =>
          setState((current) => ({
            ...current,
            seo: { ...current.seo, ...update },
          }))
        }
        error={error}
        context={{
          kind: "category",
          id: category?.id ?? null,
          name: state.name,
          path: `/category/${state.slug.trim()}`,
          text: categoryText(state),
          images: null,
          titleSettings,
          siteUrl,
        }}
      />

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Link href="/admin/categories" className={buttonClasses("secondary")}>
          انصراف
        </Link>
        <Button type="submit" loading={isPending}>
          {category ? "ذخیره‌ی تغییرات" : "ساخت دسته‌بندی"}
        </Button>
      </div>
    </form>
  );
}
