import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountNav } from "@/components/shop/account/AccountNav";
import { toPersianDigits } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = {
  title: { default: "حساب کاربری", template: "%s | حساب کاربری علی حان" },
  robots: { index: false, follow: false },
};

/** پنل کاربر؛ middleware هم `/account/*` را محافظت می‌کند */
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-5 pt-6 md:gap-8 md:px-11 md:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold md:text-4xl">
            حساب کاربری
          </h1>
          <p className="text-muted text-sm">
            {user.fullName ? `${user.fullName} · ` : ""}
            <span dir="ltr">{toPersianDigits(user.phone)}</span>
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-muted hover:text-danger text-sm transition"
          >
            خروج از حساب
          </button>
        </form>
      </header>
      <AccountNav />
      <div>{children}</div>
    </div>
  );
}
