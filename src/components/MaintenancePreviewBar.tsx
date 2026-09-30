"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MAINTENANCE_PREVIEW_COOKIE } from "@/lib/maintenance";

/**
 * نوار بالای سایت برای ادمین در حالت بروزرسانی (کوکی را middleware فقط برای
 * ادمین می‌گذارد). از کوکی خوانده می‌شود تا صفحات کش‌شده (ISR) پویا نشوند.
 */
export function MaintenancePreviewBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(
      document.cookie
        .split("; ")
        .some((part) => part.startsWith(`${MAINTENANCE_PREVIEW_COOKIE}=`)),
    );
  }, []);

  if (!show) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-sm font-bold text-amber-950"
    >
      حالت بروزرسانی فعال است؛ این صفحه را فقط شما (ادمین) می‌بینید.
      <Link href="/admin/settings" className="underline underline-offset-4">
        تنظیمات
      </Link>
    </div>
  );
}
