import type { FaqItem } from "@/lib/validation/seo";
import { splitKeywords } from "@/lib/validation/seo";

/** فیلدهای سئوی مشترک فرم محصول و دسته (مقدارها رشته‌اند تا ورودی نیمه‌کاره بماند) */

export interface FaqRow {
  /** کلید پایدار React */
  key: string;
  question: string;
  answer: string;
}

export interface SeoFormState {
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  /** با ویرگول جدا می‌شوند */
  secondaryKeywords: string;
  noindex: boolean;
  faq: FaqRow[];
}

let faqCounter = 0;
export function newFaqRow(item?: FaqItem): FaqRow {
  faqCounter += 1;
  return {
    key: `faq-${faqCounter}`,
    question: item?.question ?? "",
    answer: item?.answer ?? "",
  };
}

/** `noindex` پیش‌فرض: محصول false؛ دسته true (SEO.md §۷.۴) */
export function emptySeoForm(noindex = false): SeoFormState {
  return {
    seoTitle: "",
    metaDescription: "",
    focusKeyword: "",
    secondaryKeywords: "",
    noindex,
    faq: [],
  };
}

export function seoFormFrom(dto: {
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  noindex: boolean;
  faq: FaqItem[];
}): SeoFormState {
  return {
    seoTitle: dto.seoTitle ?? "",
    metaDescription: dto.metaDescription ?? "",
    focusKeyword: dto.focusKeyword ?? "",
    secondaryKeywords: dto.secondaryKeywords.join("، "),
    noindex: dto.noindex,
    faq: dto.faq.map((item) => newFaqRow(item)),
  };
}

/** ورودی سرور؛ ردیف‌های FAQ همان ترتیب فرم را دارند تا خطای هر ردیف سر جایش بنشیند */
export function toSeoInput(state: SeoFormState) {
  return {
    seoTitle: state.seoTitle,
    metaDescription: state.metaDescription,
    focusKeyword: state.focusKeyword,
    secondaryKeywords: splitKeywords(state.secondaryKeywords),
    noindex: state.noindex,
    faq: state.faq.map(({ question, answer }) => ({ question, answer })),
  };
}
