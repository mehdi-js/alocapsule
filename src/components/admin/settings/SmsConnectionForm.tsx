"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { toPersianDigits } from "@/lib/utils";
import {
  checkSmsCreditAction,
  saveSmsConnectionAction,
} from "@/server/actions/notification";
import type { SmsConnectionDto } from "@/server/services/sms-connection.service";

const PROVIDER_LABELS: Record<string, string> = {
  melipayamak: "ملی پیامک",
  console: "آزمایشی (فقط چاپ در ترمینال)",
};

/**
 * اتصال ملی پیامک: روش ارسال، نام کاربری و رمز/ApiKey. رمز ذخیره‌شده هرگز
 * به مرورگر برنمی‌گردد؛ فیلد خالی یعنی «رمز قبلی بماند».
 */
export function SmsConnectionForm({
  connection,
}: {
  connection: SmsConnectionDto;
}) {
  const router = useRouter();
  const toast = useToast();
  const [provider, setProvider] = useState(connection.provider);
  const [username, setUsername] = useState(connection.username);
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [saving, startSaving] = useTransition();
  const [checking, startChecking] = useTransition();

  const envProvider =
    PROVIDER_LABELS[connection.env.provider] ?? connection.env.provider;

  function submit(event: FormEvent) {
    event.preventDefault();
    startSaving(async () => {
      const result = await saveSmsConnectionAction({
        provider,
        username,
        newPassword: password,
        clearPassword,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      setPassword("");
      setClearPassword(false);
      toast.success("اتصال پیامک ذخیره شد و از همین حالا استفاده می‌شود.");
      router.refresh();
    });
  }

  function testConnection() {
    setCheck(null);
    startChecking(async () => {
      const result = await checkSmsCreditAction({ username, password });
      setCheck(
        result.ok
          ? {
              ok: true,
              text: `اتصال برقرار است. اعتبار پنل: ${toPersianDigits(result.credit.toLocaleString("en-US"))}`,
            }
          : { ok: false, text: result.message },
      );
    });
  }

  const passwordHint = connection.passwordUnreadable
    ? "⚠️ رمز ذخیره‌شده با کلید فعلی سرور باز نمی‌شود (AUTH_SECRET عوض شده)؛ دوباره وارد کنید."
    : connection.hasPassword
      ? "رمز در پنل ذخیره شده است؛ خالی بگذارید تا تغییر نکند."
      : connection.env.hasPassword
        ? "خالی = رمز فایل .env"
        : "هنوز رمزی تنظیم نشده است.";

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5"
    >
      <div>
        <h2 className="font-bold">اتصال ملی پیامک</h2>
        <p className="text-sm text-neutral-500">
          مقادیر این فرم بر فایل .env مقدم‌اند و بدون راه‌اندازی دوباره‌ی سرور
          اعمال می‌شوند. رمز به‌صورت رمزنگاری‌شده ذخیره می‌شود.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="روش ارسال" htmlFor="sms-provider" error={errors.provider}>
          <Select
            id="sms-provider"
            value={provider}
            onChange={(event) =>
              setProvider(event.target.value as typeof provider)
            }
          >
            <option value="">از فایل .env ({envProvider})</option>
            <option value="melipayamak">{PROVIDER_LABELS.melipayamak}</option>
            {connection.allowConsole ? (
              <option value="console">{PROVIDER_LABELS.console}</option>
            ) : null}
          </Select>
        </Field>
        <Field
          label="نام کاربری"
          htmlFor="sms-username"
          error={errors.username}
          hint={
            connection.env.username
              ? `خالی = از .env (${connection.env.username})`
              : undefined
          }
        >
          <Input
            id="sms-username"
            dir="ltr"
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field
          label="رمز عبور یا ApiKey"
          htmlFor="sms-password"
          error={errors.newPassword}
          hint={passwordHint}
        >
          <Input
            id="sms-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            placeholder={connection.hasPassword ? "••••••••" : ""}
            value={password}
            disabled={clearPassword}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </div>

      {connection.hasPassword ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={clearPassword}
            onChange={(event) => setClearPassword(event.target.checked)}
          />
          حذف رمز ذخیره‌شده در پنل (استفاده از .env)
        </label>
      ) : null}

      <p className="text-xs leading-6 text-neutral-500">
        خطای «ApiKey لازم است» ⇒ به‌جای رمز، ApiKey پنل ملی پیامک را وارد کنید.
        خطای «IP باید مجاز شود» ⇒ IP سرور را در پنل ملی پیامک (تنظیمات وب‌سرویس)
        اضافه کنید.
      </p>

      {check ? (
        <p
          role="status"
          className={
            check.ok
              ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {check.text}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={saving}>
          ذخیره‌ی اتصال
        </Button>
        <Button variant="secondary" loading={checking} onClick={testConnection}>
          بررسی اتصال و اعتبار
        </Button>
      </div>
    </form>
  );
}
