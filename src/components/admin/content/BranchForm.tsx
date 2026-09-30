"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { RichTextField } from "@/components/admin/seo/RichTextField";
import { SlugField } from "@/components/admin/seo/SlugField";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { saveBranchAction } from "@/server/actions/content";
import type { BranchDto } from "@/server/services/branch.service";

import {
  branchFormFrom,
  type BranchFormState,
  toBranchInput,
} from "./branch-form-state";
import { BranchHoursEditor } from "./BranchHoursEditor";

const section = "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";
const BACK = "/admin/settings/branches";

/** فرم شعبه (SEO.md §۶.۴): اطلاعات تماس، ساعات روزانه، نقشه و سئو */
export function BranchForm({ branch }: { branch: BranchDto | null }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(() => branchFormFrom(branch));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const error = (field: string) => errors[field];

  function patch(update: Partial<BranchFormState>) {
    setState((current) => ({ ...current, ...update }));
  }

  function text(
    key: keyof BranchFormState & string,
    label: string,
    options: {
      required?: boolean;
      ltr?: boolean;
      hint?: string;
      errorKey?: string;
    } = {},
  ) {
    const errorKey = options.errorKey ?? key;
    return (
      <Field
        label={label}
        htmlFor={`branch-${key}`}
        error={error(errorKey)}
        hint={options.hint}
        required={options.required}
      >
        <Input
          id={`branch-${key}`}
          dir={options.ltr ? "ltr" : undefined}
          value={state[key] as string}
          invalid={!!error(errorKey)}
          onChange={(event) =>
            patch({ [key]: event.target.value } as Partial<BranchFormState>)
          }
        />
      </Field>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveBranchAction(
        branch?.id ?? null,
        toBranchInput(state),
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(branch ? "تغییرات ذخیره شد." : "شعبه ساخته شد.");
      router.push(BACK);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <section className={section}>
        <h2 className="text-lg font-bold">اطلاعات شعبه</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("name", "نام شعبه", { required: true })}
          <SlugField
            value={state.slug}
            originalSlug={branch?.slug ?? null}
            pathPrefix="/branches/"
            example="valiasr"
            error={error("slug")}
            onChange={(slug) => patch({ slug })}
          />
          {text("city", "شهر", { required: true })}
          {text("district", "محله / منطقه")}
          {text("phone", "تلفن", { required: true, ltr: true })}
          {text("sortOrder", "ترتیب نمایش", { ltr: true })}
        </div>
        {text("address", "آدرس کامل", { required: true })}
        <label className="flex items-center gap-3 text-sm font-medium">
          فعال (نمایش در سایت)
          <Switch
            checked={state.isActive}
            label="فعال بودن شعبه"
            onChange={(isActive) => patch({ isActive })}
          />
        </label>
      </section>

      <section className={section}>
        <BranchHoursEditor
          days={state.days}
          onChange={(days) => patch({ days })}
          error={error}
        />
        {text("hoursNote", "توضیح ساعات کاری", {
          hint: "اختیاری؛ مثلاً «تعطیلات رسمی بسته است».",
          errorKey: "openingHours.note",
        })}
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">نقشه و مسیریابی</h2>
        <p className="text-sm text-neutral-600">
          لینک همین شعبه در نشان و بلد (و در صورت تمایل گوگل‌مپ). نقشه در صفحه
          جاسازی نمی‌شود تا سایت سبک بماند.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {text("neshan", "لینک نشان", {
            ltr: true,
            errorKey: "mapLinks.neshan",
          })}
          {text("balad", "لینک بلد", { ltr: true, errorKey: "mapLinks.balad" })}
          {text("google", "لینک گوگل‌مپ", {
            ltr: true,
            errorKey: "mapLinks.google",
          })}
          {text("latitude", "عرض جغرافیایی (lat)", {
            ltr: true,
            hint: "مثلاً 35.7575",
          })}
          {text("longitude", "طول جغرافیایی (lng)", {
            ltr: true,
            hint: "مثلاً 51.4101",
          })}
        </div>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">توضیحات و سئو</h2>
        <RichTextField
          id="branch-description"
          label="توضیحات صفحه‌ی شعبه (اختیاری)"
          value={state.description}
          error={error("description")}
          onChange={(description) => patch({ description })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {text("seoTitle", "عنوان سئو", { hint: "خالی ⇒ نام شعبه و شهر" })}
          {text("metaDescription", "توضیحات متا", {
            hint: "خالی ⇒ آدرس و تلفن شعبه",
          })}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Link href={BACK} className={buttonClasses("secondary")}>
          انصراف
        </Link>
        <Button type="submit" loading={isPending}>
          {branch ? "ذخیره‌ی تغییرات" : "ساخت شعبه"}
        </Button>
      </div>
    </form>
  );
}
