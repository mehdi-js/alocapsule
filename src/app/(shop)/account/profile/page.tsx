import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProfileForm } from "@/components/shop/account/ProfileForm";
import { btnOutline, panel } from "@/components/shop/styles";
import { cn } from "@/lib/utils";
import { getSessionUser, requireUser } from "@/server/auth/current-user";
import { getProfile } from "@/server/services/account.service";

export const metadata: Metadata = { title: "پروفایل" };

export default async function MyProfilePage() {
  const user = await requireUser();
  const [profile, session] = await Promise.all([
    getProfile(user.id),
    getSessionUser(),
  ]);
  if (!profile) notFound();
  const hasPassword = session?.hasPassword ?? false;
  return (
    <div className="flex flex-col gap-5">
      <ProfileForm profile={profile} />
      <section
        aria-labelledby="password-heading"
        className={cn(panel, "flex max-w-xl flex-col gap-3 p-5 md:p-6")}
      >
        <h2 id="password-heading" className="font-extrabold">
          رمز عبور
        </h2>
        <p className="text-muted text-sm leading-7">
          {hasPassword
            ? "با رمز عبور یا کد پیامکی وارد می‌شوید. پس از تغییر رمز، نشست‌های دیگر شما خارج می‌شوند."
            : "هنوز رمز عبور ندارید و با کد پیامکی وارد می‌شوید. با تعیین رمز عبور، دفعات بعد بدون پیامک هم می‌توانید وارد شوید."}
        </p>
        <Link
          href="/set-password?next=/account/profile"
          className={cn(btnOutline, "self-start")}
        >
          {hasPassword ? "تغییر رمز عبور" : "تعیین رمز عبور"}
        </Link>
      </section>
    </div>
  );
}
