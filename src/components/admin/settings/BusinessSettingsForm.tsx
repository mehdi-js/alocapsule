"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { RichTextField } from "@/components/admin/seo/RichTextField";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import type { BusinessSettings } from "@/lib/business-settings";
import { toLatinDigits } from "@/lib/utils";
import { saveBusinessSettingsAction } from "@/server/actions/settings";

import { Section } from "./SettingsSections";

/** ورودی ساعت: رقم فارسی هم پذیرفته می‌شود؛ نامعتبر ⇒ NaN (اعتبارسنج پیام می‌دهد) */
function parseHourInput(raw: string): number {
  const digits = toLatinDigits(raw).trim();
  return /^\d{1,2}$/.test(digits) ? Number(digits) : Number.NaN;
}

type State = BusinessSettings & { orderNumberPrefix: string };

/** «کسب‌وکار و خدمت» (FORK.md §۳.۶): تماس، تحویل حضوری، شرایط شارژ و شماره‌ی سفارش */
export function BusinessSettingsForm({ initial }: { initial: State }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function patch(update: Partial<State>) {
    setState((current) => ({ ...current, ...update }));
  }

  function text(
    key: keyof State & string,
    label: string,
    options: { hint?: string; ltr?: boolean } = {},
  ) {
    return (
      <Field
        label={label}
        htmlFor={`biz-${key}`}
        error={errors[key]}
        hint={options.hint}
      >
        <Input
          id={`biz-${key}`}
          dir={options.ltr ? "ltr" : undefined}
          value={String(state[key])}
          invalid={!!errors[key]}
          onChange={(event) =>
            patch({ [key]: event.target.value } as Partial<State>)
          }
        />
      </Field>
    );
  }

  function hourField(key: "openHour" | "closeHour", label: string) {
    return (
      <Field label={label} htmlFor={`biz-${key}`} error={errors[key]}>
        <Input
          id={`biz-${key}`}
          dir="ltr"
          inputMode="numeric"
          value={String(state[key])}
          invalid={!!errors[key]}
          onChange={(event) =>
            patch({
              [key]: parseHourInput(event.target.value),
            } as Partial<State>)
          }
        />
      </Field>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveBusinessSettingsAction(state);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("تنظیمات ذخیره شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Section
        title="تماس"
        hint="شماره‌ی تماس در هدر، دکمه‌ی شناور موبایل و جعبه‌ی «استعلام قیمت» محصولات استفاده می‌شود."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {text("phone", "شماره‌ی تماس", { ltr: true })}
          {text("whatsapp", "واتساپ (اختیاری)", {
            ltr: true,
            hint: "شماره یا آدرس https؛ خالی ⇒ دکمه‌ی واتساپ نمایش داده نمی‌شود.",
          })}
        </div>
      </Section>

      <Section
        title="تحویل حضوری"
        hint="در تسویه‌ی روش ارسال «بدون آدرس» و در صفحه‌ی محصول نمایش داده می‌شود."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {text("pickupHours", "ساعت تحویل حضوری")}
          {text("pickupAddress", "نشانی محل تحویل")}
        </div>
      </Section>

      <Section
        title="ساعات کاری و محدوده‌ی ارسال"
        hint="روش‌های ارسال با گزینه‌ی «فقط ساعات کاری» (مثل ارسال فوری) خارج از این بازه (به وقت تهران) در تسویه غیرفعال‌اند؛ سرور هم همین را بررسی می‌کند."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {hourField("openHour", "ساعت شروع کار (۰ تا ۲۳)")}
          {hourField("closeHour", "ساعت پایان کار (۱ تا ۲۴)")}
        </div>
        {text(
          "shippingAreaNote",
          "توضیح محدوده‌ی ارسال (زیر انتخاب آدرس در تسویه)",
        )}
      </Section>

      <Section
        title="شرایط شارژ و تعویض کپسول"
        hint="متن پیش‌فرض شرایط خدمت؛ محصولی که متن اختصاصی ندارد همین را نشان می‌دهد و مشتری هنگام ثبت سفارش می‌پذیرد."
      >
        <RichTextField
          id="biz-serviceDefaultTerms"
          label="متن پیش‌فرض شرایط"
          rows={10}
          headingLevel={3}
          value={state.serviceDefaultTerms}
          error={errors.serviceDefaultTerms}
          onChange={(serviceDefaultTerms) => patch({ serviceDefaultTerms })}
        />
        {text("serviceConsentLabel", "برچسب چک‌باکس در تسویه")}
      </Section>

      <Section
        title="جمله‌ی بالای جدول قیمت"
        hint="بالای جدول قیمت در صفحه‌ی دسته و محصول نمایش داده می‌شود؛ برای خدمت (شارژ) و کالا (خرید کپسول، پیک‌نیک) جدا."
      >
        {text("priceIncludesNote", "برای محصولات خدمت (شارژ)")}
        {text("priceIncludesNoteProducts", "برای کالا (خرید کپسول، پیک‌نیک)")}
      </Section>

      <Section title="کاتالوگ و سفارش">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-3">
          <div>
            <p className="text-sm font-medium">نمایش «قیمت هر کیلو»</p>
            <p className="text-xs text-neutral-500">
              برای محصولات با واحد گرم؛ در الو کپسول خاموش است.
            </p>
          </div>
          <Switch
            label="نمایش قیمت هر کیلو"
            checked={state.showPricePerKg}
            onChange={(showPricePerKg) => patch({ showPricePerKg })}
          />
        </div>
        <div className="max-w-xs">
          {text("orderNumberPrefix", "پیشوند شماره‌ی سفارش", {
            ltr: true,
            hint: "فقط سفارش‌های بعدی را تغییر می‌دهد؛ شماره‌ی سفارش‌های قبلی همان می‌ماند.",
          })}
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
