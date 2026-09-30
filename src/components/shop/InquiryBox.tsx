import { phoneHref } from "@/lib/site-settings";
import { toPersianDigits } from "@/lib/utils";

import { PhoneIcon, WhatsappIcon } from "./icons";
import { btnOutline, btnPrimary, panel } from "./styles";

/**
 * محصول/خدمت استعلامی (FORK.md §۴.۱): به‌جای قیمت و دکمه‌ی سبد، جعبه‌ی
 * «استعلامی» با دکمه‌ی تماس و (اگر تنظیم شده) واتساپ.
 */
export function InquiryBox({
  phone,
  whatsapp,
}: {
  phone: string;
  whatsapp: string;
}) {
  const whatsappHref = /^https:\/\//i.test(whatsapp)
    ? whatsapp
    : whatsapp
      ? `https://wa.me/${whatsapp.replace(/\D/g, "").replace(/^0/, "98")}`
      : "";
  return (
    <section
      aria-labelledby="inquiry-heading"
      className={`${panel} flex flex-col gap-4 p-5 md:p-6`}
    >
      <h2 id="inquiry-heading" className="text-lg font-extrabold">
        استعلام قیمت
      </h2>
      <p className="text-ink-soft text-sm leading-7">
        قیمت این خدمت/محصول استعلامی است. برای دریافت قیمت و هماهنگی سفارش با ما
        تماس بگیرید.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a href={phoneHref(phone)} className={btnPrimary}>
          <PhoneIcon size={18} />
          تماس: <span dir="ltr">{toPersianDigits(phone)}</span>
        </a>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={btnOutline}
          >
            <WhatsappIcon size={18} />
            واتساپ
          </a>
        ) : null}
      </div>
    </section>
  );
}
