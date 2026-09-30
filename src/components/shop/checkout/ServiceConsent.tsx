"use client";

import { useState } from "react";

import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/utils";

import { panel } from "../styles";

/**
 * پذیرش شرایط خدمت (فقط وقتی سبد آیتم خدمت دارد). متن کامل شرایط با لینک
 * «مشاهده‌ی شرایط» باز می‌شود؛ سرور بدون پذیرش سفارش را رد می‌کند.
 */
export function ServiceConsent({
  label,
  terms,
  accepted,
  onChange,
}: {
  label: string;
  terms: string;
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby="service-consent-heading"
      className={cn(panel, "flex flex-col gap-3 p-5 md:p-6")}
    >
      <h2 id="service-consent-heading" className="text-lg font-extrabold">
        شرایط شارژ و تعویض کپسول
      </h2>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-7">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          className="accent-brand-strong mt-1.5 size-4 shrink-0"
        />
        <span>
          {label}{" "}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="service-terms-text"
            className="text-accent underline underline-offset-4"
          >
            {open ? "بستن شرایط" : "مشاهده‌ی شرایط"}
          </button>
        </span>
      </label>
      {open ? (
        <div
          id="service-terms-text"
          className="border-brand-strong/40 rounded-[14px] border bg-brand-soft p-4 text-sm"
        >
          <RichText text={terms} headingLevel={3} />
        </div>
      ) : null}
    </section>
  );
}
