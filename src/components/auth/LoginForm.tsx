"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  passwordLoginAction,
  requestOtpAction,
  startLoginAction,
  verifyOtpAction,
} from "@/server/actions/auth";

import { AuthError } from "./auth-ui";
import { OtpStep, PasswordStep, PhoneStep } from "./LoginSteps";

/** فاصله‌ی مجاز تا «ارسال مجدد» (ثانیه) */
const RESEND_SECONDS = 120;

type Step = "phone" | "password" | "otp";

/**
 * ورود دومرحله‌ای: شماره ⇒ کاربر رمزدار: رمز عبور (با امکان ورود با کد
 * پیامکی / فراموشی رمز)؛ کاربر جدید یا بدون رمز: کد پیامکی و سپس تعیین رمز.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function run(task: () => Promise<void>) {
    setError(null);
    startTransition(task);
  }

  function showOtpStep() {
    setStep("otp");
    setSecondsLeft(RESEND_SECONDS);
  }

  function submitPhone() {
    run(async () => {
      const result = await startLoginAction({ phone });
      if (!result.ok) return setError(result.message);
      setForgot(false);
      if (result.method === "PASSWORD") setStep("password");
      else showOtpStep();
    });
  }

  function sendOtp(forgotPassword: boolean) {
    run(async () => {
      const result = await requestOtpAction({ phone });
      if (!result.ok) return setError(result.message);
      setForgot(forgotPassword);
      showOtpStep();
    });
  }

  function submitPassword(password: string) {
    run(async () => {
      const result = await passwordLoginAction({ phone, password });
      if (!result.ok) return setError(result.message);
      router.replace(next);
      router.refresh();
    });
  }

  function submitCode(code: string) {
    run(async () => {
      const result = await verifyOtpAction({ phone, code });
      if (!result.ok) return setError(result.message);
      router.replace(
        result.needsPassword || forgot
          ? `/set-password?next=${encodeURIComponent(next)}`
          : next,
      );
      router.refresh();
    });
  }

  function editPhone() {
    setStep("phone");
    setForgot(false);
    setError(null);
    setSecondsLeft(0);
  }

  return (
    <div className="space-y-6">
      {step === "phone" ? (
        <PhoneStep
          phone={phone}
          onPhoneChange={setPhone}
          onSubmit={submitPhone}
          pending={isPending}
        />
      ) : step === "password" ? (
        <PasswordStep
          phone={phone}
          onSubmit={submitPassword}
          onUseOtp={sendOtp}
          onEditPhone={editPhone}
          pending={isPending}
        />
      ) : (
        <OtpStep
          phone={phone}
          forgot={forgot}
          secondsLeft={secondsLeft}
          onSubmit={submitCode}
          onResend={() => sendOtp(forgot)}
          onEditPhone={editPhone}
          pending={isPending}
        />
      )}
      <AuthError message={error} />
    </div>
  );
}
