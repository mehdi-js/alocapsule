"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { toPersianDigits } from "@/lib/utils";
import { deleteBranchAction } from "@/server/actions/content";
import type { BranchDto } from "@/server/services/branch.service";

export function BranchesList({ branches }: { branches: BranchDto[] }) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<BranchDto | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteBranchAction(deleting.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("شعبه حذف شد و آدرس صفحه‌اش به فهرست شعب ریدایرکت می‌شود.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/admin/settings/branches/new"
          className={buttonClasses("primary")}
        >
          شعبه‌ی جدید
        </Link>
      </div>
      {branches.length === 0 ? (
        <EmptyState
          title="هنوز شعبه‌ای ثبت نشده است"
          description="شعب در صفحه‌ی «آدرس شعب»، «درباره ما» و داده‌ی ساختاریافته‌ی گوگل نمایش داده می‌شوند."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>نام</TH>
              <TH>شهر</TH>
              <TH>تلفن</TH>
              <TH>ترتیب</TH>
              <TH>وضعیت</TH>
              <TH>
                <span className="sr-only">عملیات</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {branches.map((branch) => (
              <TR key={branch.id}>
                <TD>
                  <span className="font-medium">{branch.name}</span>
                  <div
                    dir="ltr"
                    className="text-start text-xs text-neutral-400"
                  >
                    /branches/{branch.slug}
                  </div>
                </TD>
                <TD>
                  {branch.city || (
                    <span className="text-amber-700">تکمیل نشده</span>
                  )}
                </TD>
                <TD dir="ltr">{branch.phone}</TD>
                <TD>{toPersianDigits(branch.sortOrder)}</TD>
                <TD>{branch.isActive ? "فعال" : "غیرفعال"}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/settings/branches/${branch.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100"
                    >
                      ویرایش
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setDeleting(branch)}
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
      <ConfirmDialog
        open={deleting !== null}
        destructive
        loading={isPending}
        title="حذف شعبه"
        confirmLabel="حذف"
        description={<>شعبه‌ی «{deleting?.name}» حذف شود؟</>}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
