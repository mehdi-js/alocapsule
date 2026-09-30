import { RichText } from "@/components/ui/RichText";

/**
 * شرایط شارژ و تعویض کپسول (FORK.md §۴.۲): جعبه‌ی **باز و برجسته** (نه
 * accordion بسته) بالای دکمه‌ی افزودن به سبد.
 */
export function ServiceTermsBox({ terms }: { terms: string }) {
  return (
    <section
      aria-labelledby="service-terms-heading"
      className="border-brand/50 bg-brand-soft flex flex-col gap-3 rounded-[18px] border p-5"
    >
      <h2
        id="service-terms-heading"
        className="text-brand-strong text-base font-extrabold"
      >
        شرایط شارژ و تعویض کپسول
      </h2>
      <RichText
        text={terms}
        headingLevel={3}
        className="text-ink-soft text-sm leading-7"
      />
    </section>
  );
}
