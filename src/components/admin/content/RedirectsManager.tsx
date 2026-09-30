"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActiveSwitch } from "@/components/admin/ActiveSwitch";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatJalaliDateTime } from "@/lib/date";
import { toPersianDigits } from "@/lib/utils";
import {
  deleteRedirectAction,
  toggleRedirectAction,
} from "@/server/actions/content";
import type { RedirectListItem } from "@/server/services/redirect-query.service";

import { type EditingRedirect, RedirectFormModal } from "./RedirectFormModal";
import { RedirectImport } from "./RedirectImport";

/** صفحه‌ی «ریدایرکت‌ها» (SEO.md §۱۰.۳) */
export function RedirectsManager({
  items,
  prefillFrom,
}: {
  items: RedirectListItem[];
  /** از صفحه‌ی ۴۰۴: «ساخت ریدایرکت» برای این مسیر */
  prefillFrom: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<EditingRedirect | null>(
    prefillFrom ? { mode: "new", fromPath: prefillFrom } : null,
  );
  const [deleting, setDeleting] = useState<RedirectListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteRedirectAction(deleting.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("ریدایرکت حذف شد.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ mode: "new", fromPath: "" })}>
          ریدایرکت جدید
        </Button>
      </div>
      <RedirectImport />

      {items.length === 0 ? (
        <EmptyState
          title="ریدایرکتی ثبت نشده است"
          description="آدرس‌های سایت قبلی را به صفحات جدید منتقل کنید تا رتبه‌ی گوگل و لینک‌های قدیمی از دست نروند."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>از</TH>
              <TH>به</TH>
              <TH>استفاده</TH>
              <TH>فعال</TH>
              <TH>
                <span className="sr-only">عملیات</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <span
                    dir="ltr"
                    className="block text-start text-sm break-all"
                  >
                    {item.fromPath}
                  </span>
                  {item.note ? (
                    <span className="text-xs text-neutral-500">
                      {item.note}
                    </span>
                  ) : null}
                </TD>
                <TD>
                  {item.statusCode === 410 ? (
                    <span className="text-xs text-red-700">
                      410 — حذف دائمی
                    </span>
                  ) : (
                    <span
                      dir="ltr"
                      className="block text-start text-sm break-all"
                    >
                      {item.toPath}
                    </span>
                  )}
                </TD>
                <TD className="text-xs whitespace-nowrap">
                  {toPersianDigits(item.hits)} بار
                  {item.lastHitAt ? (
                    <span className="block text-neutral-500">
                      {formatJalaliDateTime(item.lastHitAt)}
                    </span>
                  ) : null}
                </TD>
                <TD>
                  <ActiveSwitch
                    key={`${item.id}-${item.isActive}`}
                    initialChecked={item.isActive}
                    label={`فعال بودن ریدایرکت ${item.fromPath}`}
                    activeMessage="ریدایرکت فعال شد."
                    inactiveMessage="ریدایرکت غیرفعال شد."
                    onToggle={toggleRedirectAction.bind(null, item.id)}
                  />
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing({ mode: "edit", item })}
                    >
                      ویرایش
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setDeleting(item)}
                    >
                      حذف
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <RedirectFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.replace("/admin/redirects");
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        destructive
        loading={isPending}
        title="حذف ریدایرکت"
        confirmLabel="حذف"
        description={
          <>
            ریدایرکت <span dir="ltr">{deleting?.fromPath}</span> حذف شود؟ آن
            آدرس از این به بعد ۴۰۴ می‌دهد.
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
