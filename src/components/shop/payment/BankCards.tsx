import { phoneHref } from "@/lib/site-settings";
import type { BankCardDto } from "@/server/services/payment-page.service";
import { getSiteSettings } from "@/server/services/site-settings.service";

import { CopyButton } from "./CopyButton";

/** کارت‌های فعال شرکت برای واریز کارت به کارت */
export async function BankCards({ cards }: { cards: BankCardDto[] }) {
  if (cards.length === 0) {
    const { contact } = await getSiteSettings();
    return (
      <p className="text-danger text-sm leading-7">
        اطلاعات کارت برای واریز در دسترس نیست؛ لطفاً با پشتیبانی به شماره‌ی{" "}
        <a href={phoneHref(contact.phone)} className="text-gold underline">
          {contact.phone}
        </a>{" "}
        تماس بگیرید.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {cards.map((card) => (
        <li
          key={card.id}
          className="bg-card flex flex-col gap-3 rounded-[18px] border border-[rgb(201_168_118/0.22)] p-4 md:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">{card.bankName}</span>
            <span className="text-muted text-sm">
              به نام {card.accountHolderName}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              dir="ltr"
              className="text-gold font-mono text-xl font-bold tracking-wider md:text-2xl"
            >
              {card.cardNumber}
            </span>
            <CopyButton value={card.cardDigits} label="کپی شماره کارت" />
          </div>
          {card.shebaNumber ? (
            <div className="text-ink-2 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                شبا:{" "}
                <span dir="ltr" className="font-mono">
                  {card.shebaNumber}
                </span>
              </span>
              <CopyButton value={card.shebaNumber} label="کپی شماره شبا" />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
