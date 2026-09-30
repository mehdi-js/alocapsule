"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { PASSWORD_MIN_LENGTH } from "@/lib/password-config";
import { toPersianDigits } from "@/lib/utils";
import { setPasswordAction } from "@/server/actions/auth";

import { AuthError, authPrimaryButton, PasswordInput } from "./auth-ui";

const RULE_HINT = `حداقل ${toPersianDigits(PASSWORD_MIN_LENGTH)} کاراکتر، شامل حرف و عدد.`;

/** تعیین رمز (ثبت‌نام / فراموشی) یا تغییر آن (با رمز فعلی) */
export function SetPasswordForm({
  requireCurrent,
  next,
  submitLabel,
}: {
  requireCurrent: boolean;
  next: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setPasswordAction({
        currentPassword: requireCurrent ? currentPassword : undefined,
        password,
        confirmPassword,
      });
      if (!result.ok) {
        const errors = result.fieldErrors ?? {};
        setFieldErrors(errors);
        // خطای فیلدی زیر همان فیلد نمایش داده می‌شود
        setError(Object.keys(errors).length > 0 ? null : result.message);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  const describedBy = (key: string) =>
    fieldErrors[key] ? `${key}-error` : undefined;
  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <p id={`${key}-error`} className="text-danger text-xs">
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {requireCurrent ? (
        <div className="space-y-2">
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium"
          >
            رمز عبور فعلی
          </label>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.currentPassword)}
            required
            autoFocus
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          رمز عبور جدید
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={describedBy("password") ?? "password-hint"}
          required
          autoFocus={!requireCurrent}
        />
        {fieldError("password") ?? (
          <p id="password-hint" className="text-muted text-xs">
            {RULE_HINT}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          تکرار رمز عبور جدید
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={describedBy("confirmPassword")}
          required
        />
        {fieldError("confirmPassword")}
      </div>

      <button type="submit" disabled={isPending} className={authPrimaryButton}>
        {isPending ? "در حال ذخیره…" : submitLabel}
      </button>
      <AuthError message={error} />
    </form>
  );
}
