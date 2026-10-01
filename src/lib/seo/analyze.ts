import { richTextLinks, richTextToPlain } from "@/lib/rich-text";
import { toPersianDigits } from "@/lib/utils";

import { imageChecks } from "./image-checks";
import { SIMILARITY_BAD, similarityLevel } from "./similarity";
import { countWords, normalizeFa } from "./text";
import {
  buildDocumentTitle,
  effectiveMeta,
  effectiveTitle,
  type TitleSettings,
} from "./title";

/**
 * تحلیلگر سئو (جایگزین Yoast، SEO.md §۱۰.۲). تابع خالص؛ همان در فرم ادمین
 * (کلاینت) و در لیست محصولات (سرور). **فقط هشدار است** و هرگز ذخیره را
 * مسدود نمی‌کند.
 */

export type SeoStatus = "good" | "warn" | "bad";

export type SeoCheckId =
  | "titleLength"
  | "metaLength"
  | "focusKeyword"
  | "keywordInTitle"
  | "keywordInH1"
  | "keywordInMeta"
  | "keywordInIntro"
  | "wordCount"
  | "imageAlt"
  | "imageAltRepeated"
  | "primaryImage"
  | "internalLinks"
  | "duplicateKeyword"
  | "duplicateTitle"
  | "duplicateMeta"
  | "textSimilarity"
  | "keywordDensity"
  | "noindex";

export interface SeoCheck {
  id: SeoCheckId;
  status: SeoStatus;
  message: string;
}

/** نام صفحه‌های رقیب («محصول «…»») برای هر مورد تکراری */
export interface SeoConflicts {
  focusKeyword: string[];
  seoTitle: string[];
  metaDescription: string[];
  /**
   * شباهت `description` با محصولات هم‌دسته (SEO.md §۷.۵)؛ فقط برای محصول و
   * وقتی متن داده شده. نبود کلید ⇒ چک اجرا نمی‌شود.
   */
  similarText?: { name: string; score: number }[];
}

export interface SeoAnalysisInput {
  /** H1 صفحه */
  name: string;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  /** متن اصلی صفحه در قالب rich text (توضیحات محصول یا متن دسته) */
  text: string | null;
  /** `null` ⇒ صفحه تصویر ندارد و چک‌های تصویر اجرا نمی‌شود (دسته) */
  images: { alt: string; isPrimary: boolean }[] | null;
  noindex: boolean;
  titleSettings: TitleSettings;
  /** `null` ⇒ هنوز از سرور نیامده؛ چک‌های تکراری اجرا نمی‌شود */
  conflicts: SeoConflicts | null;
}

export const SEO_LIMITS = {
  titleMin: 30,
  titleMax: 65,
  metaMin: 110,
  metaMax: 160,
  minWords: 250,
  introWords: 100,
  /** حداکثر تکرار کلمه‌ی کانونی در هر ۳۰۰ کلمه */
  densityPer300: 6,
} as const;

const fa = (value: number) => toPersianDigits(value);

function contains(haystack: string, keyword: string): boolean {
  return normalizeFa(haystack).includes(normalizeFa(keyword));
}

function countOccurrences(text: string, keyword: string): number {
  const needle = normalizeFa(keyword);
  if (!needle) return 0;
  return normalizeFa(text).split(needle).length - 1;
}

function lengthCheck(
  id: SeoCheckId,
  label: string,
  length: number,
  min: number,
  max: number,
): SeoCheck {
  const range = `${fa(min)} تا ${fa(max)}`;
  if (length >= min && length <= max)
    return {
      id,
      status: "good",
      message: `طول ${label} مناسب است (${fa(length)} کاراکتر).`,
    };
  return {
    id,
    status: "warn",
    message: `طول ${label} ${fa(length)} کاراکتر است؛ بهتر است ${range} باشد.`,
  };
}

function duplicateCheck(
  id: SeoCheckId,
  label: string,
  competitors: string[],
): SeoCheck {
  return competitors.length === 0
    ? { id, status: "good", message: `${label} در سایت یکتاست.` }
    : {
        id,
        status: "bad",
        message: `${label} با ${competitors.join("، ")} تکراری است.`,
      };
}

/** بیشترین شباهت با محصولات هم‌دسته؛ بالای ۶۰٪ قرمز، ۴۰ تا ۶۰ نارنجی */
function similarityCheck(similar: { name: string; score: number }[]): SeoCheck {
  const top = [...similar].sort((a, b) => b.score - a.score)[0];
  const percent = (score: number) => fa(Math.round(score * 100));
  if (!top) {
    return {
      id: "textSimilarity",
      status: "good",
      message: "متن با محصولات هم‌دسته مقایسه شد و یکتاست.",
    };
  }
  const level = similarityLevel(top.score);
  if (level === "good") {
    return {
      id: "textSimilarity",
      status: "good",
      message: `شباهت متن با محصولات هم‌دسته کم است (بیشینه ${percent(top.score)}٪).`,
    };
  }
  return {
    id: "textSimilarity",
    status: level === "bad" ? "bad" : "warn",
    message:
      level === "bad"
        ? `متن این صفحه با ${top.name} تقریباً یکسان است (${percent(top.score)}٪ شباهت، بیشتر از ${percent(SIMILARITY_BAD)}٪)؛ گوگل آن‌ها را تکراری می‌بیند.`
        : `متن این صفحه با ${top.name} شباهت زیادی دارد (${percent(top.score)}٪)؛ بخش‌های مخصوص این صفحه را بیشتر کنید.`,
  };
}

function keywordChecks(
  input: SeoAnalysisInput,
  keyword: string,
  plain: string,
  words: number,
): SeoCheck[] {
  const title = effectiveTitle(input.seoTitle, input.name);
  const meta = effectiveMeta(input.metaDescription, input.text);
  const intro = plain.split(/\s+/).slice(0, SEO_LIMITS.introWords).join(" ");
  const occurrences = countOccurrences(plain, keyword);
  const allowed = Math.max(
    3,
    Math.ceil((words * SEO_LIMITS.densityPer300) / 300),
  );
  const has = (id: SeoCheckId, ok: boolean, where: string): SeoCheck => ({
    id,
    status: ok ? "good" : "warn",
    message: ok
      ? `کلمه‌ی کانونی در ${where} آمده است.`
      : `کلمه‌ی کانونی در ${where} نیامده است.`,
  });
  return [
    {
      ...has("keywordInTitle", contains(title, keyword), "عنوان سئو"),
      // عنوان مهم‌ترین سیگنال است
      status: contains(title, keyword) ? "good" : "bad",
    },
    has("keywordInH1", contains(input.name, keyword), "نام (H1)"),
    has("keywordInMeta", contains(meta, keyword), "توضیحات متا"),
    has(
      "keywordInIntro",
      contains(intro, keyword),
      `${fa(SEO_LIMITS.introWords)} کلمه‌ی اول متن`,
    ),
    occurrences > allowed
      ? {
          id: "keywordDensity",
          status: "warn",
          message: `کلمه‌ی کانونی ${fa(occurrences)} بار تکرار شده؛ برای این متن حداکثر ${fa(allowed)} بار طبیعی است (پر کردن کلمه).`,
        }
      : {
          id: "keywordDensity",
          status: "good",
          message: `تکرار کلمه‌ی کانونی طبیعی است (${fa(occurrences)} بار).`,
        },
  ];
}

export function analyzeSeo(input: SeoAnalysisInput): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const plain = richTextToPlain(input.text);
  const words = countWords(plain);
  const keyword = input.focusKeyword?.trim() ?? "";

  if (input.noindex) {
    checks.push({
      id: "noindex",
      status: "bad",
      message: "این صفحه noindex است و در گوگل نمایش داده نمی‌شود.",
    });
  }

  const fullTitle = buildDocumentTitle(
    effectiveTitle(input.seoTitle, input.name),
    input.titleSettings,
  );
  checks.push(
    lengthCheck(
      "titleLength",
      "عنوان کامل (با نام برند)",
      fullTitle.length,
      SEO_LIMITS.titleMin,
      SEO_LIMITS.titleMax,
    ),
  );

  const meta = input.metaDescription?.trim() ?? "";
  checks.push(
    meta
      ? lengthCheck(
          "metaLength",
          "توضیحات متا",
          meta.length,
          SEO_LIMITS.metaMin,
          SEO_LIMITS.metaMax,
        )
      : {
          id: "metaLength",
          status: "bad",
          message: "توضیحات متا خالی است؛ فعلاً از ابتدای متن ساخته می‌شود.",
        },
  );

  if (keyword) {
    checks.push(...keywordChecks(input, keyword, plain, words));
  } else {
    checks.push({
      id: "focusKeyword",
      status: "warn",
      message: "کلمه‌ی کانونی تعیین نشده است.",
    });
  }

  checks.push(
    words >= SEO_LIMITS.minWords
      ? {
          id: "wordCount",
          status: "good",
          message: `متن ${fa(words)} کلمه دارد.`,
        }
      : {
          id: "wordCount",
          status: "warn",
          message: `متن ${fa(words)} کلمه دارد؛ حداقل ${fa(SEO_LIMITS.minWords)} کلمه پیشنهاد می‌شود.`,
        },
  );

  if (input.images) checks.push(...imageChecks(input.images));

  const internalLinks = richTextLinks(input.text).filter((l) => l.internal);
  checks.push(
    internalLinks.length > 0
      ? {
          id: "internalLinks",
          status: "good",
          message: `${fa(internalLinks.length)} لینک داخلی در متن هست.`,
        }
      : {
          id: "internalLinks",
          status: "warn",
          message:
            "متن لینک داخلی ندارد؛ مثلاً [دسته‌ی نمونه](/category/example-category).",
        },
  );

  if (input.conflicts) {
    if (keyword)
      checks.push(
        duplicateCheck(
          "duplicateKeyword",
          "کلمه‌ی کانونی",
          input.conflicts.focusKeyword,
        ),
      );
    checks.push(
      duplicateCheck("duplicateTitle", "عنوان سئو", input.conflicts.seoTitle),
    );
    if (meta)
      checks.push(
        duplicateCheck(
          "duplicateMeta",
          "توضیحات متا",
          input.conflicts.metaDescription,
        ),
      );
  }

  if (input.conflicts?.similarText) {
    checks.push(similarityCheck(input.conflicts.similarText));
  }

  const order: Record<SeoStatus, number> = { bad: 0, warn: 1, good: 2 };
  return checks.sort((a, b) => order[a.status] - order[b.status]);
}

export { type SeoSummary, summarizeSeo } from "./summary";
