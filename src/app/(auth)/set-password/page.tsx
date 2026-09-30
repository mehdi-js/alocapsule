import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { Logo } from "@/components/shop/Logo";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { toPersianDigits } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { getSessionUser } from "@/server/auth/current-user";
import { currentPasswordRequired } from "@/server/services/password.service";

export const metadata: Metadata = {
  title: "رمز عبور",
  robots: { index: false },
};

/**
 * تعیین رمز عبور (اجباری پس از اولین ورود با کد پیامکی، یا پس از «فراموشی
 * رمز») و تغییر رمز از پنل کاربر. کاربرِ بدون رمز تا این‌جا را کامل نکند
 * هیچ‌جا واردشده حساب نمی‌شود.
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const rawNext = (await searchParams).next;
  const current = await getSessionUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent(safeRedirectPath(rawNext))}`);
  }

  const { user, session, hasPassword } = current;
  const fallback = hasPassword
    ? "/account/profile"
    : user.role === "ADMIN"
      ? "/admin"
      : "/";
  const next = safeRedirectPath(rawNext, fallback);
  const requireCurrent = currentPasswordRequired(hasPassword, session);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Logo />
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">
          {hasPassword ? "رمز عبور جدید" : "تعیین رمز عبور"}
        </h1>
        <p className="text-muted leading-[2]">
          {hasPassword ? "رمز عبور حساب " : "برای تکمیل ثبت‌نام، برای حساب "}
          <span dir="ltr">{toPersianDigits(user.phone)}</span>
          {hasPassword
            ? " را عوض کنید. نشست‌های دیگر شما پس از تغییر رمز خارج می‌شوند."
            : " یک رمز عبور بگذارید. از این پس می‌توانید با رمز عبور یا کد پیامکی وارد شوید."}
        </p>
      </header>

      <SetPasswordForm
        requireCurrent={requireCurrent}
        next={next}
        submitLabel={hasPassword ? "ذخیره‌ی رمز جدید" : "ذخیره و ادامه"}
      />

      <div className="flex items-center justify-between text-sm">
        {hasPassword ? (
          <Link href={next} className="text-muted underline underline-offset-4">
            انصراف
          </Link>
        ) : (
          <span />
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-muted hover:text-danger underline underline-offset-4 transition"
          >
            خروج از حساب
          </button>
        </form>
      </div>
    </main>
  );
}
