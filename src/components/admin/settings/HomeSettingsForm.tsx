"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { HomeSettings } from "@/lib/home-settings";
import { saveHomeSettingsAction } from "@/server/actions/settings";

import { PairList, Section } from "./SettingsSections";

type TextKey =
  | "heroTitle"
  | "heroSubtitle"
  | "heroPrimaryCta"
  | "heroSecondaryCta"
  | "stepsTitle"
  | "featuredTitle"
  | "aboutTitle"
  | "aboutText"
  | "customersTitle"
  | "ctaTitle"
  | "ctaText";

const emptyText = () => ({ title: "", text: "" });
const emptyStat = () => ({ label: "", value: "" });

/** متن‌های صفحه‌ی اصلی (FORK.md §۵.۳)؛ آمار خالی ⇒ بخش آمار نمایش داده نمی‌شود */
export function HomeSettingsForm({ initial }: { initial: HomeSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<HomeSettings>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function patch(update: Partial<HomeSettings>) {
    setState((current) => ({ ...current, ...update }));
  }

  function text(
    key: TextKey,
    label: string,
    options: { multiline?: boolean; hint?: string } = {},
  ) {
    const Control = options.multiline ? Textarea : Input;
    return (
      <Field
        label={label}
        htmlFor={`home-${key}`}
        error={errors[key]}
        hint={options.hint}
      >
        <Control
          id={`home-${key}`}
          value={state[key]}
          invalid={!!errors[key]}
          onChange={(event) =>
            patch({ [key]: event.target.value } as Partial<HomeSettings>)
          }
        />
      </Field>
    );
  }

  /** فهرست ردیف‌دار با افزودن/حذف (مراحل، مشتریان، آمار) */
  function listControls(
    kind: "steps" | "customers" | "stats",
    max: number,
    minItems: number,
    addLabel: string,
  ) {
    const items = state[kind];
    return {
      actions: (index: number) =>
        items.length > minItems ? (
          <button
            type="button"
            className="text-xs text-red-600 hover:underline"
            onClick={() =>
              patch({
                [kind]: items.filter((_, i) => i !== index),
              } as Partial<HomeSettings>)
            }
          >
            حذف
          </button>
        ) : null,
      add:
        items.length < max ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              patch({
                [kind]: [
                  ...items,
                  kind === "stats" ? emptyStat() : emptyText(),
                ],
              } as Partial<HomeSettings>)
            }
          >
            {addLabel}
          </Button>
        ) : null,
    };
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveHomeSettingsAction(state);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("متن‌های صفحه‌ی اصلی ذخیره شد.");
      router.refresh();
    });
  }

  const steps = listControls("steps", 6, 2, "افزودن مرحله");
  const customers = listControls("customers", 6, 1, "افزودن مورد");
  const stats = listControls("stats", 6, 0, "افزودن آمار");

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        عنوان اصلی (H1)، توضیحات متا و تصویر/اسلایدها از «سئو» و «بنرها» تنظیم
        می‌شوند؛ اینجا متن‌های بخش‌های صفحه‌ی اصلی است.
      </p>

      <Section title="هیرو">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("heroTitle", "تیتر")}
          {text("heroSubtitle", "توضیح یک‌خطی", { multiline: true })}
          {text("heroPrimaryCta", "دکمه‌ی اول (سفارش شارژ)")}
          {text("heroSecondaryCta", "دکمه‌ی دوم (تماس تلفنی)")}
        </div>
      </Section>

      <Section
        title="«شارژ کپسول چطور انجام می‌شود؟»"
        hint="۲ تا ۶ مرحله‌ی شماره‌دار؛ منطق تعویض کپسول باید روشن باشد."
      >
        {text("stepsTitle", "عنوان بخش")}
        <PairList
          name="steps"
          items={state.steps}
          legends={state.steps.map((_, i) => `مرحله ${i + 1}`)}
          fields={[
            { key: "title", label: "عنوان" },
            { key: "text", label: "متن" },
          ]}
          errors={errors}
          onChange={(steps) => patch({ steps })}
          columns="sm:grid-cols-2"
          actions={steps.actions}
        />
        {steps.add}
      </Section>

      <Section title="محصولات منتخب و درباره ما">
        {text("featuredTitle", "عنوان محصولات منتخب")}
        {text("aboutTitle", "عنوان درباره ما")}
        {text("aboutText", "متن درباره ما (خلاصه)", {
          multiline: true,
          hint: "ادعای واقعی (سابقه، آمار) را فقط با اطلاعات درست بنویسید.",
        })}
      </Section>

      <Section title="مشتریان ما" hint="مثلاً خانگی، تجاری، صنعتی.">
        {text("customersTitle", "عنوان بخش")}
        <PairList
          name="customers"
          items={state.customers}
          legends={state.customers.map((_, i) => `مورد ${i + 1}`)}
          fields={[
            { key: "title", label: "عنوان" },
            { key: "text", label: "متن" },
          ]}
          errors={errors}
          onChange={(customers) => patch({ customers })}
          columns="sm:grid-cols-3"
          actions={customers.actions}
        />
        {customers.add}
      </Section>

      <Section
        title="آمار"
        hint="فقط عددهای واقعی. اگر خالی بگذارید کل بخش آمار در صفحه‌ی اصلی نمایش داده نمی‌شود."
      >
        <PairList
          name="stats"
          items={state.stats}
          legends={state.stats.map((_, i) => `آمار ${i + 1}`)}
          fields={[
            { key: "value", label: "عدد" },
            { key: "label", label: "برچسب" },
          ]}
          errors={errors}
          onChange={(nextStats) => patch({ stats: nextStats })}
          columns="sm:grid-cols-3"
          actions={stats.actions}
        />
        {stats.add}
      </Section>

      <Section title="دعوت به تماس (پایین صفحه)">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("ctaTitle", "عنوان")}
          {text("ctaText", "متن", { multiline: true })}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Button type="submit" loading={pending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}
