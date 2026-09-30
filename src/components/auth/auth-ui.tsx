"use client";

import { type InputHTMLAttributes, useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/shop/icons";
import { btnPrimary } from "@/components/shop/styles";
import { cn } from "@/lib/utils";

/** ظاهر مشترک صفحه‌های ورود و تعیین رمز */
export const authInputClass =
  "w-full rounded-full border border-[rgb(201_168_118/0.22)] bg-card px-5 py-3.5 text-lg text-ink outline-none placeholder:text-faint focus:border-[rgb(201_168_118/0.55)] aria-[invalid=true]:border-danger";
export const authPrimaryButton = cn(btnPrimary, "w-full");
export const authLinkButton =
  "text-muted underline underline-offset-4 disabled:opacity-60";

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[18px] border border-[#E06B5B]/40 bg-[#E06B5B]/10 px-4 py-3 text-sm text-[#E06B5B]"
    >
      {message}
    </p>
  );
}

/** فیلد رمز با دکمه‌ی نمایش/پنهان */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        dir="ltr"
        className={cn(authInputClass, "pl-14 text-left", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        aria-pressed={visible}
        className="text-muted hover:text-ink absolute inset-y-0 left-0 flex w-14 items-center justify-center transition"
      >
        {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
      </button>
    </div>
  );
}
