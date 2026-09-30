import type { MetadataRoute } from "next";

import { isIndexingAllowed } from "@/lib/seo/indexing";
import { SITE } from "@/lib/site-content";

/** robots.txt پویا تا با `ALLOW_INDEXING` هنگام اجرا (نه build) عوض شود */
export const dynamic = "force-dynamic";

/**
 * SEO.md §۸.۲–۸.۳. `/products?q=` (جستجو) بسته نمی‌شود؛ با متای
 * `noindex, follow` کنترل می‌شود تا گوگل آن متا را ببیند.
 */
export default function robots(): MetadataRoute.Robots {
  const sitemap = new URL("/sitemap.xml", SITE.url).toString();
  if (!isIndexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" }, sitemap };
  }
  return {
    rules: {
      userAgent: "*",
      // تصاویر محصول از /api/media سرو می‌شوند؛ قاعده‌ی دقیق‌تر بر Disallow /api/
      // مقدم است تا گوگل تصاویر (og:image و schema) را بخزد
      allow: ["/", "/api/media/"],
      disallow: [
        "/admin",
        "/account",
        "/cart",
        "/checkout",
        "/login",
        "/set-password",
        "/api/",
      ],
    },
    sitemap,
  };
}
