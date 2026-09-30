import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { MenuBody } from "@/components/menu/MenuBody";
import { Logo } from "@/components/shop/Logo";
import { SITE } from "@/lib/site-content";
import { safeDecode } from "@/lib/utils";
import { getPublicMenu } from "@/server/services/menu-query.service";

type Params = Promise<{ slug: string }>;

/**
 * منوی شعبه (مقصد QR code): صفحه‌ی مستقل و سبک برای موبایل، بدون هدر
 * فروشگاه. در اولین درخواست ساخته و کش می‌شود؛ هر تغییر در ادمین همین
 * مسیر را revalidate می‌کند.
 */
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

const loadMenu = cache(async (params: Params) => {
  const { slug } = await params;
  return getPublicMenu(safeDecode(slug).toLowerCase());
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const menu = await loadMenu(params);
  if (!menu) return { title: "منو یافت نشد" };
  return {
    title: `منوی ${menu.name}`,
    description: menu.description ?? `منوی ${menu.name} — ${SITE.name}`,
    alternates: { canonical: `/menu/${menu.slug}` },
  };
}

export default async function MenuPage({ params }: { params: Params }) {
  const menu = await loadMenu(params);
  if (!menu) notFound();

  return (
    <main className="bg-canvas mx-auto flex min-h-screen w-full max-w-[560px] flex-col">
      <header className="relative overflow-hidden px-5 pt-10 pb-8 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(201_168_118/0.16),transparent_60%)]"
        />
        <div className="relative flex flex-col items-center gap-3">
          <Logo size={30} priority />
          <p className="text-gold mt-2 text-xs font-bold tracking-[0.3em]">
            منو
          </p>
          <h1 className="text-[28px] leading-tight font-extrabold">
            {menu.name}
          </h1>
          {menu.description ? (
            <p className="text-muted max-w-sm text-sm leading-7">
              {menu.description}
            </p>
          ) : null}
        </div>
      </header>

      {menu.categories.length > 0 ? (
        <MenuBody categories={menu.categories} />
      ) : (
        <p className="text-muted px-5 py-16 text-center">
          منوی این شعبه به‌زودی تکمیل می‌شود.
        </p>
      )}

      <footer className="text-muted mt-auto flex flex-col items-center gap-3 px-5 pt-8 pb-10 text-center text-xs">
        <p>همه‌ی قیمت‌ها به تومان است.</p>
        <Link
          href="/"
          className="border-gold/50 text-ink hover:bg-card rounded-full border px-5 py-2.5 text-sm font-bold transition"
        >
          خرید آنلاین باقلوای {SITE.name}
        </Link>
      </footer>
    </main>
  );
}
