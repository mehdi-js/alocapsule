"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, toPersianDigits } from "@/lib/utils";
import type { MenuSummaryDto } from "@/server/services/menu-query.service";

import { MenuFormModal } from "./MenuFormModal";

/** فهرست منوهای شعبه‌ها + ساخت منوی جدید */
export function MenusManager({ menus }: { menus: MenuSummaryDto[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>منوی جدید</Button>
      </div>

      {menus.length === 0 ? (
        <EmptyState
          title="هنوز منویی ساخته نشده"
          description="برای هر شعبه یک منو بسازید؛ هر منو آدرس و QR code جدای خودش را دارد."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {menus.map((menu) => (
            <li
              key={menu.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">{menu.name}</h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    menu.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-neutral-100 text-neutral-500",
                  )}
                >
                  {menu.isActive ? "فعال" : "غیرفعال"}
                </span>
              </div>
              <a
                href={menu.url}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="truncate text-left text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
              >
                {menu.url.replace(/^https?:\/\//, "")}
              </a>
              <p className="text-sm text-neutral-600">
                {toPersianDigits(menu.categoryCount)} دسته ·{" "}
                {toPersianDigits(menu.itemCount)} آیتم
              </p>
              <Link
                href={`/admin/menus/${menu.id}`}
                className={buttonClasses("secondary", "sm", "mt-auto")}
              >
                ویرایش آیتم‌ها و QR code
              </Link>
            </li>
          ))}
        </ul>
      )}

      <MenuFormModal
        editing={creating ? "new" : null}
        copySources={menus.map(({ id, name }) => ({ id, name }))}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
