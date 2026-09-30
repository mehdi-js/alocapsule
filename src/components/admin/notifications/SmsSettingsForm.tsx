"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { SmsType } from "@/lib/notification-templates";
import { toPersianDigits } from "@/lib/utils";
import { saveSmsSettingsAction } from "@/server/actions/notification";
import type { SmsSettingsDto } from "@/server/services/sms-settings.service";

import { SmsTypeCard, type SmsTypeState } from "./SmsTypeCard";

type ByType<T> = Record<SmsType, T>;

function initialState(settings: SmsSettingsDto): ByType<SmsTypeState> {
  return Object.fromEntries(
    settings.types.map((entry) => [
      entry.type,
      {
        template: entry.template,
        variables: entry.variables,
        pattern: entry.patternOverride,
      },
    ]),
  ) as ByType<SmsTypeState>;
}

function pick<K extends keyof SmsTypeState>(
  state: ByType<SmsTypeState>,
  key: K,
): ByType<SmsTypeState[K]> {
  return Object.fromEntries(
    Object.entries(state).map(([type, value]) => [type, value[key]]),
  ) as ByType<SmsTypeState[K]>;
}

/**
 * همه‌ی پیامک‌های سایت (کد ورود + سفارش + مدیر): متن، ترتیب متغیرها و
 * شناسه‌ی الگو، به‌علاوه‌ی شماره‌ی مدیر. اگر ملی پیامک متنی را تغییر داد،
 * همین‌جا اصلاح می‌شود و نیازی به تغییر کد نیست.
 */
export function SmsSettingsForm({ settings }: { settings: SmsSettingsDto }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(() => initialState(settings));
  const [adminPhone, setAdminPhone] = useState(settings.adminPhoneOverride);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveSmsSettingsAction({
        templates: pick(state, "template"),
        variables: pick(state, "variables"),
        patterns: pick(state, "pattern"),
        adminPhone,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      toast.success("تنظیمات پیامک ذخیره شد.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-bold">شماره‌ی مدیر</h2>
        <Field
          label="موبایل دریافت پیامک‌های مدیر (رسید جدید، پرداخت با کیف پول)"
          htmlFor="sms-admin-phone"
          error={errors.adminPhone}
          hint={
            settings.envAdminPhone
              ? `خالی = از .env (${toPersianDigits(settings.envAdminPhone)})`
              : "خالی = پیامک مدیر فرستاده نمی‌شود"
          }
        >
          <Input
            id="sms-admin-phone"
            value={adminPhone}
            onChange={(event) => setAdminPhone(event.target.value)}
            invalid={Boolean(errors.adminPhone)}
            inputMode="tel"
            dir="ltr"
            placeholder="09123456789"
            className="max-w-xs"
          />
        </Field>
      </section>

      {settings.types.map((entry) => (
        <SmsTypeCard
          key={entry.type}
          type={entry.type}
          value={state[entry.type]}
          onChange={(next) =>
            setState((current) => ({ ...current, [entry.type]: next }))
          }
          envPattern={entry.envPattern}
          provider={settings.provider}
          errors={errors}
        />
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" loading={pending} className="shadow-lg">
          ذخیره‌ی همه‌ی پیامک‌ها
        </Button>
      </div>
    </form>
  );
}
