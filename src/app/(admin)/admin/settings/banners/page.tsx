import type { Metadata } from "next";

import { BannersForm } from "@/components/admin/settings/BannersForm";
import { getBanners } from "@/server/services/banner.service";

export const metadata: Metadata = { title: "بنرها و اسلایدر" };

export default async function BannersSettingsPage() {
  const banners = await getBanners();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
        هر بنر دو نسخه دارد: <strong>دسکتاپ</strong> (کادر پهن) و{" "}
        <strong>موبایل</strong> (کادر تقریباً مربع). چون شکل کادرها خیلی فرق
        دارد، برای نتیجه‌ی بهتر نسخه‌ی موبایل جدا بسازید؛ اگر خالی بماند، همان
        تصویر دسکتاپ از وسط برش می‌خورد. اندازه‌ی پیشنهادی کنار هر تصویر نوشته
        شده (JPG، PNG یا WebP تا ۵ مگابایت؛ خودکار فشرده می‌شود).
      </div>
      <BannersForm key={JSON.stringify(banners)} initial={banners} />
    </div>
  );
}
