"use client";

import { type FormEvent, useState } from "react";

import { OTP_LENGTH } from "@/lib/otp-config";
import { cn, toPersianDigits } from "@/lib/utils";

import {
  authInputClass,
  authLinkButton,
  authPrimaryButton,
  PasswordInput,
} from "./auth-ui";

/** گام‌های فرم ورود؛ state و فراخوانی اکشن‌ها در `LoginForm` است. */

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return toPersianDigits(`${minutes}:${String(rest).padStart(2, "0")}`);
}

function submitWith(handler: () => void) {
  return (event: FormEvent) => {
    event.preventDefault();
    handler();
  };
}

export function PhoneStep({
  phone,
  onPhoneChange,
  onSubmit,
  pending,
}: {
  phone: string;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <form onSubmit={submitWith(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="phone" className="block text-sm font-medium">
          شماره‌ی موبایل
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder="09123456789"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          className={`${authInputClass} text-left`}
          required
          autoFocus
        />
      </div>
      <button type="submit" disabled={pending} className={authPrimaryButton}>
        {pending ? "در حال بررسی…" : "ادامه"}
      </button>
    </form>
  );
}

function PhoneSummary({
  phone,
  onEdit,
}: {
  phone: string;
  onEdit: () => void;
}) {
  return (
    <p className="text-muted flex items-center justify-between gap-3 text-sm">
      <span>
        شماره‌ی <span dir="ltr">{toPersianDigits(phone)}</span>
      </span>
      <button type="button" onClick={onEdit} className={authLinkButton}>
        ویرایش شماره
      </button>
    </p>
  );
}

export function PasswordStep({
  phone,
  onSubmit,
  onUseOtp,
  onEditPhone,
  pending,
}: {
  phone: string;
  onSubmit: (password: string) => void;
  /** `forgot` ⇒ پس از ورود با کد، رمز جدید تعیین می‌شود */
  onUseOtp: (forgot: boolean) => void;
  onEditPhone: () => void;
  pending: boolean;
}) {
  const [password, setPassword] = useState("");
  return (
    <form onSubmit={submitWith(() => onSubmit(password))} className="space-y-4">
      <PhoneSummary phone={phone} onEdit={onEditPhone} />
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          رمز عبور
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoFocus
        />
      </div>
      <button type="submit" disabled={pending} className={authPrimaryButton}>
        {pending ? "در حال بررسی…" : "ورود"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => onUseOtp(false)}
          disabled={pending}
          className="text-accent font-medium underline underline-offset-4 disabled:opacity-60"
        >
          ورود با کد پیامکی
        </button>
        <button
          type="button"
          onClick={() => onUseOtp(true)}
          disabled={pending}
          className={authLinkButton}
        >
          رمز عبور را فراموش کرده‌ام
        </button>
      </div>
    </form>
  );
}

export function OtpStep({
  phone,
  forgot,
  secondsLeft,
  onSubmit,
  onResend,
  onEditPhone,
  pending,
}: {
  phone: string;
  forgot: boolean;
  secondsLeft: number;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onEditPhone: () => void;
  pending: boolean;
}) {
  const [code, setCode] = useState("");
  return (
    <form onSubmit={submitWith(() => onSubmit(code))} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="code" className="block text-sm font-medium">
          کد تأیید
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={OTP_LENGTH}
          placeholder={"۰".repeat(OTP_LENGTH)}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={cn(authInputClass, "text-center tracking-[0.5em]")}
          required
          autoFocus
        />
        <p className="text-muted text-xs leading-6">
          کد {toPersianDigits(OTP_LENGTH)} رقمی به شماره‌ی{" "}
          <span dir="ltr">{toPersianDigits(phone)}</span> ارسال شد.
          {forgot ? " پس از ورود، رمز عبور جدید را تعیین می‌کنید." : null}
        </p>
      </div>
      <button type="submit" disabled={pending} className={authPrimaryButton}>
        {pending ? "در حال بررسی…" : "ورود"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onEditPhone} className={authLinkButton}>
          ویرایش شماره
        </button>
        {secondsLeft > 0 ? (
          <span className="text-muted" aria-live="polite">
            ارسال مجدد تا {formatCountdown(secondsLeft)}
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={pending}
            className="text-accent font-medium underline underline-offset-4 disabled:opacity-60"
          >
            ارسال مجدد کد
          </button>
        )}
      </div>
    </form>
  );
}
