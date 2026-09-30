"use client";

import { Button, buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * QR code منو برای چاپ: پیش‌نمایش، کپی لینک، دانلود PNG (۱۰۲۴ پیکسل از
 * سرور) و SVG (برداری، مناسب چاپخانه).
 */
export function MenuQrCard({
  menuId,
  slug,
  url,
  svg,
  isActive,
}: {
  menuId: string;
  slug: string;
  url: string;
  /** SVG تولیدشده در سرور از روی `url` (کتابخانه‌ی qrcode) */
  svg: string;
  isActive: boolean;
}) {
  const toast = useToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک منو کپی شد.");
    } catch {
      toast.error("کپی ممکن نشد؛ لینک را دستی انتخاب کنید.");
    }
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `menu-${slug}-qr.svg`;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section
      aria-labelledby="qr-heading"
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center"
    >
      <div
        role="img"
        aria-label={`QR code منو: ${url}`}
        className="mx-auto size-44 shrink-0 rounded-lg border border-neutral-200 bg-white p-1 sm:mx-0 [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 id="qr-heading" className="font-bold">
          QR code و لینک منو
        </h2>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className="truncate text-left text-sm text-neutral-600 hover:underline"
        >
          {url}
        </a>
        {!isActive ? (
          <p className="text-sm text-amber-700">
            این منو غیرفعال است؛ تا فعال نشود، اسکن QR به صفحه‌ی «یافت نشد»
            می‌رسد.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/menus/${menuId}/qr`}
            className={buttonClasses("primary", "sm")}
          >
            دانلود PNG
          </a>
          <Button variant="secondary" size="sm" onClick={downloadSvg}>
            دانلود SVG (چاپ)
          </Button>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            کپی لینک
          </Button>
        </div>
      </div>
    </section>
  );
}
