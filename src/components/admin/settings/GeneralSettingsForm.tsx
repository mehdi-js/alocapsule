"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SOCIAL_LABELS, type SocialKey } from "@/lib/site-settings";
import { parseIntegerInput } from "@/lib/utils";
import type { GeneralSettingsFormInput } from "@/lib/validation/settings";
import { saveGeneralSettingsAction } from "@/server/actions/settings";

import { EnamadSection } from "./EnamadSection";
import { PairList, Section } from "./SettingsSections";

const TRUST_LABELS = [
  "کاشی اول (کیفیت)",
  "کاشی دوم (ارسال)",
  "کاشی سوم (بسته‌بندی)",
];

/** تنظیمات عمومی: سقف تعداد، تماس، شبکه‌های اجتماعی، نوار اعتماد، آمار، متن ارسال */
export function GeneralSettingsForm({
  initial,
}: {
  initial: Omit<GeneralSettingsFormInput, "maxQuantityPerItem"> & {
    maxQuantityPerItem: number;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [maxQuantity, setMaxQuantity] = useState(
    String(initial.maxQuantityPerItem),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const err = (key: string) => errors[key];
  const field = (key: string) => ({
    invalid: Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveGeneralSettingsAction({
        ...values,
        maxQuantityPerItem: parseIntegerInput(maxQuantity) ?? Number.NaN,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      toast.success("تنظیمات ذخیره شد و سایت به‌روز شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Section
        title="سبد خرید"
        hint="این انبارداری نیست؛ فقط جلوی خطای تایپ مشتری را می‌گیرد."
      >
        <Field
          label="سقف تعداد هر قلم در سبد"
          htmlFor="maxQuantityPerItem"
          error={err("maxQuantityPerItem")}
          required
        >
          <Input
            id="maxQuantityPerItem"
            value={maxQuantity}
            onChange={(e) => setMaxQuantity(e.target.value)}
            inputMode="numeric"
            dir="ltr"
            className="max-w-40"
            {...field("maxQuantityPerItem")}
          />
        </Field>
      </Section>

      <Section
        title="اطلاعات تماس"
        hint="در فوتر، منوی موبایل، صفحه‌ی تماس و صفحه‌ی پرداخت نمایش داده می‌شود."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="تلفن"
            htmlFor="contact.phone"
            error={err("contact.phone")}
            required
          >
            <Input
              id="contact.phone"
              value={values.contact.phone}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  contact: { ...v.contact, phone: e.target.value },
                }))
              }
              {...field("contact.phone")}
            />
          </Field>
          <Field
            label="ایمیل"
            htmlFor="contact.email"
            error={err("contact.email")}
            required
          >
            <Input
              id="contact.email"
              type="email"
              dir="ltr"
              value={values.contact.email}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  contact: { ...v.contact, email: e.target.value },
                }))
              }
              {...field("contact.email")}
            />
          </Field>
          <Field
            label="نشانی"
            htmlFor="contact.address"
            error={err("contact.address")}
            className="md:col-span-2"
            required
          >
            <Input
              id="contact.address"
              value={values.contact.address}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  contact: { ...v.contact, address: e.target.value },
                }))
              }
              {...field("contact.address")}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="شبکه‌های اجتماعی"
        hint="آدرس کامل با https://؛ خالی ⇒ آیکون نمایش داده نمی‌شود."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(SOCIAL_LABELS) as SocialKey[]).map((key) => (
            <Field
              key={key}
              label={SOCIAL_LABELS[key]}
              htmlFor={`social.${key}`}
              error={err(`social.${key}`)}
            >
              <Input
                id={`social.${key}`}
                dir="ltr"
                value={values.social[key]}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    social: { ...v.social, [key]: e.target.value },
                  }))
                }
                {...field(`social.${key}`)}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section
        title="نوار اعتماد"
        hint="سه کاشی صفحه‌ی اصلی و صفحه‌ی محصول (آیکون‌ها ثابت‌اند)."
      >
        <PairList
          name="trustItems"
          items={values.trustItems}
          legends={TRUST_LABELS}
          fields={[
            { key: "title", label: "عنوان" },
            { key: "subtitle", label: "زیرعنوان" },
          ]}
          errors={errors}
          onChange={(trustItems) => setValues((v) => ({ ...v, trustItems }))}
          columns="md:grid-cols-3"
        />
      </Section>

      <Section
        title="آمار «درباره ما»"
        hint="چهار عدد صفحه‌ی درباره ما (مثل «۱۸» + «سال تجربه»). خالی بگذارید تا این بخش نمایش داده نشود."
      >
        <PairList
          name="aboutStats"
          items={values.aboutStats}
          legends={["آمار ۱", "آمار ۲", "آمار ۳", "آمار ۴"]}
          fields={[
            { key: "value", label: "عدد" },
            { key: "label", label: "برچسب" },
          ]}
          errors={errors}
          onChange={(aboutStats) => setValues((v) => ({ ...v, aboutStats }))}
          columns="sm:grid-cols-2 xl:grid-cols-4"
        />
        {values.aboutStats.length === 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValues((v) => ({
                ...v,
                aboutStats: Array.from({ length: 4 }, () => ({
                  value: "",
                  label: "",
                })),
              }))
            }
          >
            افزودن آمار
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setValues((v) => ({ ...v, aboutStats: [] }))}
          >
            حذف همه‌ی آمار
          </Button>
        )}
      </Section>

      <Section
        title="ارسال و نگهداری"
        hint="متن آکاردئون «ارسال و نگهداری» در صفحه‌ی همه‌ی محصولات."
      >
        <Field
          label="متن"
          htmlFor="shippingNote"
          error={err("shippingNote")}
          required
        >
          <Textarea
            id="shippingNote"
            value={values.shippingNote}
            maxLength={600}
            onChange={(e) =>
              setValues((v) => ({ ...v, shippingNote: e.target.value }))
            }
            {...field("shippingNote")}
          />
        </Field>
      </Section>

      <EnamadSection
        value={values.enamad}
        error={err("enamad")}
        onChange={(enamad) => setValues((v) => ({ ...v, enamad }))}
      />

      <Button type="submit" loading={pending}>
        ذخیره‌ی تنظیمات
      </Button>
    </form>
  );
}
