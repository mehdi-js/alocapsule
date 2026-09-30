"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatJalaliDateTime } from "@/lib/date";
import { toPersianDigits } from "@/lib/utils";
import { deleteNotFoundAction } from "@/server/actions/content";

export interface NotFoundItem {
  id: string;
  path: string;
  hits: number;
  lastSeenAt: Date;
  lastReferrer: string | null;
}

/** «خطاهای ۴۰۴» (SEO.md §۱۰.۴): پرتکرارها اول، با «ساخت ریدایرکت» */
export function NotFoundTable({ items }: { items: NotFoundItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [clearing, setClearing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove(ids: string[] | "all") {
    startTransition(async () => {
      const result = await deleteNotFoundAction(ids);
      setClearing(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("از فهرست حذف شد.");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="خطای ۴۰۴ ثبت نشده است"
        description="آدرس‌هایی که بازدیدکننده یا گوگل باز کرده‌اند و وجود ندارند اینجا می‌آیند (درخواست ربات‌های مخرب ثبت نمی‌شود)."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="text-red-600"
          onClick={() => setClearing(true)}
        >
          پاک کردن همه
        </Button>
      </div>
      <Table>
        <THead>
          <tr>
            <TH>آدرس</TH>
            <TH>تعداد</TH>
            <TH>آخرین بار</TH>
            <TH>ارجاع‌دهنده</TH>
            <TH>
              <span className="sr-only">عملیات</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {items.map((item) => (
            <TR key={item.id}>
              <TD>
                <span dir="ltr" className="block text-start text-sm break-all">
                  {item.path}
                </span>
              </TD>
              <TD>{toPersianDigits(item.hits)}</TD>
              <TD className="text-xs whitespace-nowrap">
                {formatJalaliDateTime(item.lastSeenAt)}
              </TD>
              <TD>
                <span
                  dir="ltr"
                  className="block max-w-56 truncate text-start text-xs text-neutral-500"
                  title={item.lastReferrer ?? undefined}
                >
                  {item.lastReferrer ?? "—"}
                </span>
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/admin/redirects?from=${encodeURIComponent(item.path)}`}
                    className={buttonClasses("secondary", "sm")}
                  >
                    ساخت ریدایرکت
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => remove([item.id])}
                  >
                    نادیده
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <ConfirmDialog
        open={clearing}
        destructive
        loading={isPending}
        title="پاک کردن لاگ ۴۰۴"
        confirmLabel="پاک کردن همه"
        description="همه‌ی ردیف‌های لاگ ۴۰۴ حذف شوند؟"
        onConfirm={() => remove("all")}
        onCancel={() => setClearing(false)}
      />
    </div>
  );
}
