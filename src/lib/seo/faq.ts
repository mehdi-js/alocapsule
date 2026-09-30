import { z } from "zod";

import { type FaqItem, faqItemSchema } from "@/lib/validation/seo";

/** FAQ ذخیره‌شده (Json) ⇒ آرایه‌ی معتبر؛ داده‌ی خراب نادیده گرفته می‌شود */
export function parseFaq(value: unknown): FaqItem[] {
  const parsed = z.array(faqItemSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}
