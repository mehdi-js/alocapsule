import type { ReactNode } from "react";

import { BottomTabBar } from "@/components/shop/BottomTabBar";
import { ShopProviders } from "@/components/shop/cart/ShopProviders";
import { FloatingCall } from "@/components/shop/FloatingCall";
import { Footer } from "@/components/shop/Footer";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { getBusinessSettings } from "@/server/services/store-content.service";

/**
 * پوسته‌ی فروشگاه. سبد در کلاینت (CartProvider) بارگذاری می‌شود تا صفحات
 * کش‌شده به کوکی وابسته نشوند.
 */
export default async function ShopLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { phone } = await getBusinessSettings();
  return (
    <ShopProviders>
      <div className="flex min-h-screen flex-col pb-24 md:pb-0">
        <a
          href="#main"
          className="bg-brand-strong text-on-brand sr-only rounded-full px-4 py-2 font-bold focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
        >
          پرش به محتوای اصلی
        </a>
        <ShopHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <FloatingCall phone={phone} />
        <BottomTabBar />
      </div>
    </ShopProviders>
  );
}
