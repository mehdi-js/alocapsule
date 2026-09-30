"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { duplicateProductAction } from "@/server/actions/product";

/**
 * «کپی محصول»: یک محصول غیرفعال با همه‌ی گزینه‌ها، ترکیب‌ها، قیمت‌ها، تصاویر،
 * شرایط خدمت و فیلدهای سئو می‌سازد (کلمه‌ی کانونی خالی) و به ویرایش آن می‌رود.
 */
export function DuplicateProductButton({
  productId,
  productName,
  size = "sm",
}: {
  productId: string;
  productName: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateProductAction(productId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        "کپی ساخته شد (غیرفعال). نام، نامک و قیمت‌ها را اصلاح و محصول را فعال کنید.",
      );
      router.push(`/admin/products/${result.id}/edit`);
    });
  }

  return (
    <Button
      variant="ghost"
      size={size}
      loading={pending}
      onClick={duplicate}
      aria-label={`کپی محصول ${productName}`}
    >
      کپی
    </Button>
  );
}
