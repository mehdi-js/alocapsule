import { richTextToPlain } from "@/lib/rich-text";

import { resolveTitleTemplate } from "./settings";
import { truncateAtWord } from "./text";

/** طول متای خودکار (SEO.md §۵.۱) */
export const AUTO_META_LENGTH = 155;

export interface TitleSettings {
  brandName: string;
  /** مثل `"%s | {brandName}"` */
  titleTemplate: string;
}

/** عنوان صفحه در تگ `<title>`: `seoTitle` ← اگر خالی `name`، در قالب برند */
export function buildDocumentTitle(
  title: string,
  settings: TitleSettings,
): string {
  const template = resolveTitleTemplate(
    settings.titleTemplate,
    settings.brandName,
  );
  return template.includes("%s")
    ? template.replace("%s", title.trim())
    : title.trim();
}

export function effectiveTitle(
  seoTitle: string | null | undefined,
  name: string,
): string {
  return seoTitle?.trim() || name.trim();
}

/** ۱۵۵ کاراکتر اول متن (بدون قالب‌بندی)، بریده‌شده روی مرز کلمه */
export function autoMetaDescription(text: string | null | undefined): string {
  return truncateAtWord(
    richTextToPlain(text).replace(/\s+/g, " ").trim(),
    AUTO_META_LENGTH,
  );
}

export function effectiveMeta(
  metaDescription: string | null | undefined,
  text: string | null | undefined,
): string {
  return metaDescription?.trim() || autoMetaDescription(text);
}
