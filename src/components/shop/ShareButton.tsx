"use client";

import { useState } from "react";

import { ShareIcon } from "./icons";
import { iconButton } from "./styles";

/** اشتراک‌گذاری صفحه: Web Share API در موبایل، کپی لینک در دسکتاپ. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // کاربر اشتراک را لغو کرده؛ کاری لازم نیست
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        aria-label="اشتراک‌گذاری محصول"
        className={iconButton}
      >
        <ShareIcon size={18} />
      </button>
      {copied ? (
        <span
          role="status"
          className="bg-card absolute top-full end-0 mt-2 rounded-full px-3 py-1 text-xs whitespace-nowrap"
        >
          لینک کپی شد
        </span>
      ) : null}
    </div>
  );
}
