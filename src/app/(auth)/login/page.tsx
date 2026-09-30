import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/shop/Logo";
import { btnOutline, btnPrimary } from "@/components/shop/styles";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { SITE } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { getSessionUser } from "@/server/auth/current-user";

export const metadata: Metadata = {
  title: "ورود",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeRedirectPath((await searchParams).next);
  const current = await getSessionUser();
  // ثبت‌نام نیمه‌کاره: تعیین رمز اجباری است
  if (current && !current.hasPassword) {
    redirect(`/set-password?next=${encodeURIComponent(next)}`);
  }
  const user = current?.user;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Logo />
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">ورود به {SITE.name}</h1>
        <p className="text-muted leading-[2]">
          با شماره‌ی موبایل وارد شوید؛ اگر حساب ندارید، با کد پیامکی ثبت‌نام
          می‌کنید و یک رمز عبور می‌گذارید.
        </p>
      </header>

      {user ? (
        <div className="space-y-4">
          <p className="bg-panel rounded-[18px] border border-hair px-5 py-4">
            با شماره‌ی <span dir="ltr">{user.phone}</span> وارد شده‌اید.
          </p>
          <div className="flex gap-3">
            <Link href={next} className={cn(btnPrimary, "flex-1")}>
              ادامه
            </Link>
            <form action={logoutAction} className="flex-1">
              <button type="submit" className={cn(btnOutline, "w-full")}>
                خروج از حساب
              </button>
            </form>
          </div>
        </div>
      ) : (
        <LoginForm next={next} />
      )}
    </main>
  );
}
