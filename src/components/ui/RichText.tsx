import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { type Inline, parseRichText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * رندر «متن ساده با قالب‌بندی» (`lib/rich-text.ts`). HTML خام هرگز رندر
 * نمی‌شود. `headingLevel`: سطح `##` (مثلاً ۳ وقتی صفحه خودش H2 «توضیحات» دارد).
 */

function InlineContent({ inlines }: { inlines: Inline[] }) {
  return inlines.map((inline, index) => {
    if (inline.type === "strong")
      return <strong key={index}>{inline.text}</strong>;
    if (inline.type === "link") {
      return inline.internal ? (
        <Link
          key={index}
          href={inline.href}
          className="underline underline-offset-4"
        >
          {inline.text}
        </Link>
      ) : (
        <a
          key={index}
          href={inline.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline underline-offset-4"
        >
          {inline.text}
        </a>
      );
    }
    return <Fragment key={index}>{inline.text}</Fragment>;
  });
}

export function RichText({
  text,
  headingLevel = 2,
  className,
}: {
  text: string | null | undefined;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-3 leading-8", className)}>
      {blocks.map((block, index): ReactNode => {
        if (block.type === "heading") {
          const level = Math.min(block.level + headingLevel - 2, 4);
          const Tag = `h${level}` as "h2" | "h3" | "h4";
          return (
            <Tag
              key={index}
              className={cn(
                "font-bold",
                level === 2 ? "mt-2 text-xl" : "mt-1 text-lg",
              )}
            >
              <InlineContent inlines={block.content} />
            </Tag>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 ps-6">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineContent inlines={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <InlineContent inlines={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
