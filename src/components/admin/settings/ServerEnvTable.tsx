import Link from "next/link";

import { cn } from "@/lib/utils";
import type { getServerEnvStatus } from "@/server/services/server-env.service";

/** وضعیت متغیرهای .env سرور (فقط‌خواندنی؛ مقدار محرمانه نمایش داده نمی‌شود) */
export function ServerEnvTable({
  groups,
}: {
  groups: ReturnType<typeof getServerEnvStatus>;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">تنظیمات فایل .env سرور</h2>
        <p className="text-sm leading-7 text-neutral-600">
          این مقادیر فقط از فایل <span dir="ltr">.env.production</span> روی سرور
          تغییر می‌کنند (راهنما: DEPLOYMENT.md). این‌جا فقط وضعیتشان را
          می‌بینید؛ آن‌هایی که در پنل قابل تنظیم‌اند با لینک مشخص شده‌اند.
        </p>
      </div>
      {groups.map((group) => (
        <div
          key={group.title}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
        >
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <h3 className="font-bold">{group.title}</h3>
            <p className="text-xs leading-6 text-neutral-500">{group.note}</p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {group.entries.map((entry) => (
              <li
                key={entry.name}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{entry.label}</p>
                  <p
                    dir="ltr"
                    className="text-left font-mono text-xs text-neutral-500"
                  >
                    {entry.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {entry.value ? (
                    <span
                      dir="ltr"
                      className="max-w-64 truncate font-mono text-xs text-neutral-700"
                    >
                      {entry.value}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs",
                      entry.isSet
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-100 text-neutral-500",
                    )}
                  >
                    {entry.isSet
                      ? entry.secret
                        ? "تنظیم شده (مخفی)"
                        : "تنظیم شده"
                      : "خالی"}
                  </span>
                  {entry.editableAt ? (
                    <Link
                      href={entry.editableAt.href}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      قابل تنظیم در {entry.editableAt.label}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
