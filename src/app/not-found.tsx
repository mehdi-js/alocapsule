import type { Metadata } from "next";
import Link from "next/link";

import { BottomTabBar } from "@/components/shop/BottomTabBar";
import { ShopProviders } from "@/components/shop/cart/ShopProviders";
import { Footer } from "@/components/shop/Footer";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { btnOutline, btnPrimary, panel } from "@/components/shop/styles";

export const metadata: Metadata = {
  title: "صفحه یافت نشد",
  robots: { index: false },
};

/** ۴۰۴ سراسری (هم آدرس ناموجود، هم notFound() در صفحات) با پوسته‌ی فروشگاه */
export default function NotFound() {
  return (
    <ShopProviders>
      <div className="flex min-h-screen flex-col pb-24 md:pb-0">
        <ShopHeader />
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 items-center px-5 py-12 md:px-11">
          <div
            className={`${panel} flex w-full flex-col items-center gap-5 px-6 py-20 text-center`}
          >
            <p dir="ltr" className="text-accent font-mono text-5xl font-bold">
              404
            </p>
            <h1 className="text-2xl font-extrabold md:text-3xl">
              صفحه‌ای که دنبالش هستید پیدا نشد
            </h1>
            <p className="text-muted max-w-md text-sm leading-[2]">
              ممکن است آدرس اشتباه باشد یا این محصول دیگر در فروشگاه نمایش داده
              نشود.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/products" className={btnPrimary}>
                مشاهده محصولات
              </Link>
              <Link href="/" className={btnOutline}>
                صفحه اصلی
              </Link>
            </div>
          </div>
        </main>
        <Footer />
        <BottomTabBar />
      </div>
    </ShopProviders>
  );
}
