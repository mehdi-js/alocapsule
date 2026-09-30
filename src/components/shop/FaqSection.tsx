import { ChevronDownIcon } from "./icons";

/**
 * سوالات متداول با `<details>`: متن کامل همه‌ی پاسخ‌ها در HTML اولیه است
 * (SEO.md §۳ ردیف ۵) و بدون جاوااسکریپت باز و بسته می‌شود.
 */
export function FaqSection({
  items,
  id = "faq",
  title = "سوالات متداول",
}: {
  items: { question: string; answer: string }[];
  id?: string;
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="text-2xl font-extrabold md:text-[28px]">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <details
            key={index}
            className="bg-panel group rounded-[18px] border border-[rgb(201_168_118/0.14)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5.5 py-4.5 font-bold">
              <h3 className="text-base">{item.question}</h3>
              <ChevronDownIcon
                size={16}
                className="text-gold shrink-0 transition group-open:rotate-180"
              />
            </summary>
            <p className="text-ink-2 px-5.5 pb-5 text-sm leading-[2.1] whitespace-pre-line">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
