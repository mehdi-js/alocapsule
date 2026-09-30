import { SITE } from "@/lib/site-content";
import { getSiteSettings } from "@/server/services/site-settings.service";

import { TRUST_ICONS } from "./icons";

/** آیکون هر کاشی ثابت است؛ عنوان و زیرعنوان از تنظیمات */
const TRUST_ICON_KEYS = ["shield", "truck", "gift"] as const;

async function trustItems() {
  const { trustItems: items } = await getSiteSettings();
  return items.map((item, index) => ({
    ...item,
    icon: TRUST_ICON_KEYS[index] ?? "shield",
  }));
}

/** نوار اعتماد: دسکتاپ سه ستون با جداکننده، موبایل سه کاشی کوچک. */
export async function TrustBar() {
  const items = await trustItems();
  return (
    <section
      aria-label={`مزیت‌های خرید از ${SITE.name}`}
      className="bg-panel grid grid-cols-3 gap-3 rounded-[18px] border border-hair p-3 md:gap-0 md:px-9 md:py-6"
    >
      {items.map((item, index) => {
        const TrustIcon = TRUST_ICONS[item.icon];
        return (
          <div
            key={item.title}
            className={`flex flex-col items-center justify-center gap-2 text-center md:flex-row md:gap-3.5 ${
              index === 1 ? "md:border-x md:border-hair" : ""
            }`}
          >
            <span className="bg-card text-brand-strong flex size-12 shrink-0 items-center justify-center rounded-full max-md:size-10">
              <TrustIcon size={22} />
            </span>
            <span className="flex flex-col gap-0.5 md:items-start">
              <span className="text-[11px] font-bold md:text-base">
                {item.title}
              </span>
              <span className="text-muted hidden text-[13px] md:block">
                {item.subtitle}
              </span>
            </span>
          </div>
        );
      })}
    </section>
  );
}

/** سه کاشی کوچک زیر جعبه‌ی قیمت در صفحه‌ی محصول */
export async function TrustTiles() {
  const items = await trustItems();
  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((item) => {
        const TrustIcon = TRUST_ICONS[item.icon];
        return (
          <li
            key={item.title}
            className="bg-panel flex flex-col items-center gap-2 rounded-[14px] border border-hair px-2 py-4 text-center"
          >
            <TrustIcon size={20} className="text-accent" />
            <span className="text-[13px] font-medium">{item.title}</span>
          </li>
        );
      })}
    </ul>
  );
}
