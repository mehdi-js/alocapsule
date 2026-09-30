import type { Metadata } from "next";

import { SeoSettingsForm } from "@/components/admin/settings/SeoSettingsForm";
import { isIndexingAllowed } from "@/lib/seo/indexing";
import { getSeoSettings } from "@/server/services/seo-settings.service";

export const metadata: Metadata = { title: "تنظیمات سئو" };

export default async function SeoSettingsPage() {
  const settings = await getSeoSettings();
  const indexing = isIndexingAllowed();
  return (
    <div className="space-y-6">
      <p
        className={
          indexing
            ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            : "rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900"
        }
      >
        {indexing
          ? "سایت برای گوگل باز است (ALLOW_INDEXING=true)."
          : "سایت برای گوگل بسته است (ALLOW_INDEXING=true تنظیم نشده): robots.txt همه‌چیز را می‌بندد و همه‌ی صفحات noindex هستند. فقط روی سرور اصلی و هنگام انتشار باز شود."}
      </p>
      <SeoSettingsForm key={JSON.stringify(settings)} settings={settings} />
    </div>
  );
}
