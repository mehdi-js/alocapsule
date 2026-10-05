import { RichText } from "@/components/ui/RichText";

import { CollapsibleText } from "./CollapsibleText";
import { FaqSection } from "./FaqSection";
import { panel } from "./styles";

/**
 * بلوک محتوای سئو و سوالات متداول صفحه‌ی اصلی (SEO.md §۵.۴)، از تنظیمات
 * سئوی پنل. قابل مشاهده (نه پنهان) و در موبایل و دسکتاپ یکسان در DOM.
 */
export function HomeSeoContent({
  content,
  faq,
}: {
  content: string;
  faq: { question: string; answer: string }[];
}) {
  if (!content.trim() && faq.length === 0) return null;
  return (
    <div className="flex flex-col gap-10">
      {content.trim() ? (
        <section
          aria-label="درباره‌ی خرید از ما"
          className={`${panel} text-ink-soft p-6 text-[15px] md:p-10`}
        >
          {/* بلوک سئو: فقط ابتدایش دیده می‌شود و با فلش باز می‌شود؛ کل متن در HTML هست */}
          <CollapsibleText>
            <RichText
              text={content}
              headingLevel={2}
              className="[&_a]:text-brand-strong [&_h2]:text-ink max-w-[900px] [&_h2]:text-xl md:[&_h2]:text-2xl"
            />
          </CollapsibleText>
        </section>
      ) : null}
      <FaqSection items={faq} id="home-faq" />
    </div>
  );
}
