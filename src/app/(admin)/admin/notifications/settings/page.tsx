import type { Metadata } from "next";
import Link from "next/link";

import { SmsSettingsForm } from "@/components/admin/notifications/SmsSettingsForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/auth/current-user";
import { getSmsSettings } from "@/server/services/sms-settings.service";

export const metadata: Metadata = { title: "متن و الگوی پیامک‌ها" };

export default async function SmsSettingsPage() {
  await requireAdmin();
  const settings = await getSmsSettings();

  return (
    <>
      <PageHeader
        title="متن و الگوی پیامک‌ها"
        crumbs={[
          { label: "پیامک‌ها", href: "/admin/notifications" },
          { label: "تنظیمات" },
        ]}
      />
      <div className="mb-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        <p>
          پیامک‌ها <strong>الگویی (خدماتی)</strong> هستند: متن اصلی باید در پنل
          ملی پیامک ثبت و تأیید شود و فقط مقادیر متغیرها به همان ترتیب{" "}
          <span dir="ltr">{"{0}، {1}، …"}</span> فرستاده می‌شوند (شماره‌گذاری
          ملی پیامک از صفر است). متن این صفحه برای پیش‌نمایش، حالت آزمایشی و لاگ
          است و باید با متن تأییدشده‌ی پنل یکی باشد.
        </p>
        <p>
          روند: متن را در پنل ملی پیامک (وب‌سرویس خدماتی) ثبت کنید ← پس از
          تأیید، همان متن و <strong>ترتیب متغیرها</strong> را این‌جا بگذارید و
          شناسه‌ی الگو را وارد کنید. اگر ملی پیامک متن را اصلاح کرد، فقط همین
          صفحه را به‌روز کنید.
        </p>
        <p>
          حالت ارسال فعلی:{" "}
          <strong dir="ltr">
            {settings.provider === "console"
              ? "console (فقط چاپ در ترمینال)"
              : settings.provider}
          </strong>
          {" — "}
          <Link
            href="/admin/settings/server"
            className="underline underline-offset-4"
          >
            نام کاربری و رمز/ApiKey ملی پیامک
          </Link>
        </p>
      </div>
      {/* پس از ذخیره، فرم با مقادیر نرمال‌شده‌ی سرور دوباره ساخته می‌شود */}
      <SmsSettingsForm
        key={JSON.stringify([settings.types, settings.adminPhoneOverride])}
        settings={settings}
      />
    </>
  );
}
