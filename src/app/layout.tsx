import "./globals.css";

import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { MaintenancePreviewBar } from "@/components/MaintenancePreviewBar";
import { buildRootMetadata } from "@/lib/seo/metadata";
import {
  getSeoContext,
  getSeoSettings,
} from "@/server/services/seo-settings.service";

const vazirmatn = localFont({
  src: "../../public/fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  variable: "--font-vazirmatn",
  display: "swap",
});

/**
 * metadataBase، قالب عنوان از `seo.brandName`، robots پیش‌فرض
 * (`ALLOW_INDEXING`) و متای تأیید Search Console/Bing (SEO.md §۵.۱، §۸).
 */
export async function generateMetadata(): Promise<Metadata> {
  const [context, seo] = await Promise.all([getSeoContext(), getSeoSettings()]);
  return buildRootMetadata(context, {
    homeTitle: seo.home.title,
    verification: {
      google: seo.verificationGoogle || null,
      bing: seo.verificationBing || null,
    },
  });
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa-IR" dir="rtl" className={vazirmatn.variable}>
      <body className="bg-canvas text-ink min-h-screen antialiased">
        {children}
        <MaintenancePreviewBar />
      </body>
    </html>
  );
}
