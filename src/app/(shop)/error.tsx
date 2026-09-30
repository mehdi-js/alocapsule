"use client";

import Link from "next/link";
import { useEffect } from "react";

import { btnOutline, btnPrimary, panel } from "@/components/shop/styles";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-12 md:px-11">
      <div
        role="alert"
        className={`${panel} flex flex-col items-center gap-5 px-6 py-20 text-center`}
      >
        <h1 className="text-2xl font-extrabold">مشکلی پیش آمد</h1>
        <p className="text-muted max-w-md text-sm leading-[2]">
          در بارگذاری این صفحه خطایی رخ داد. لطفاً دوباره تلاش کنید.
        </p>
        {error.digest ? (
          <p dir="ltr" className="text-faint font-mono text-xs">
            {error.digest}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={btnPrimary}>
            تلاش دوباره
          </button>
          <Link href="/" className={btnOutline}>
            صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
