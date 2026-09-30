import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shop/Logo";
import { phoneHref } from "@/lib/site-settings";
import { getMaintenance } from "@/server/services/maintenance.service";
import { getSiteSettings } from "@/server/services/site-settings.service";

export const metadata: Metadata = {
  title: "در حال بروزرسانی",
  robots: { index: false, follow: false },
};

/** همیشه وضعیت زنده (middleware همه‌ی صفحات را در حالت بروزرسانی به این‌جا می‌آورد) */
export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const [maintenance, settings] = await Promise.all([
    getMaintenance(),
    getSiteSettings(),
  ]);
  // حالت بروزرسانی خاموش ⇒ این آدرس به صفحه‌ی اصلی می‌رود
  if (!maintenance.enabled) redirect("/");
  const { phone } = settings.contact;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(201_168_118/0.14),transparent_60%)]"
      />
      <div className="relative flex max-w-md flex-col items-center gap-6">
        <Logo size={40} href={null} priority />
        <span
          aria-hidden
          className="border-accent/40 bg-card flex size-20 items-center justify-center rounded-full border"
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
          </svg>
        </span>
        <h1 className="text-3xl font-extrabold">در حال بروزرسانی</h1>
        <p className="text-ink-soft text-base leading-8">
          {maintenance.message}
        </p>
        {phone ? (
          <p className="text-muted text-sm">
            تماس:{" "}
            <a
              href={phoneHref(phone)}
              dir="ltr"
              className="text-ink underline underline-offset-4"
            >
              {phone}
            </a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
