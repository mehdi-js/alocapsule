import { parseIntegerInput } from "@/lib/utils";
import type { CategoryFormInput } from "@/lib/validation/category";
import type { CategoryEditDto } from "@/server/services/category.service";

import {
  emptySeoForm,
  seoFormFrom,
  type SeoFormState,
  toSeoInput,
} from "./seo/seo-form-state";

export interface CategoryFormState {
  name: string;
  slug: string;
  /** H1 صفحه‌ی دسته؛ خالی ⇒ نام */
  h1: string;
  parentId: string;
  /** زیرعنوان صفحه‌ی دسته */
  description: string;
  sortOrder: string;
  isActive: boolean;
  /** نمایش در بخش دسته‌های صفحه‌ی اصلی */
  isFeatured: boolean;
  introText: string;
  bottomContent: string;
  seo: SeoFormState;
}

export function categoryFormFrom(
  dto: CategoryEditDto | null,
): CategoryFormState {
  if (!dto) {
    return {
      name: "",
      slug: "",
      h1: "",
      parentId: "",
      description: "",
      sortOrder: "0",
      isActive: true,
      isFeatured: false,
      introText: "",
      bottomContent: "",
      seo: emptySeoForm(),
    };
  }
  return {
    name: dto.name,
    slug: dto.slug,
    h1: dto.h1 ?? "",
    parentId: dto.parentId ?? "",
    description: dto.description ?? "",
    sortOrder: String(dto.sortOrder),
    isActive: dto.isActive,
    isFeatured: dto.isFeatured,
    introText: dto.introText ?? "",
    bottomContent: dto.bottomContent ?? "",
    seo: seoFormFrom(dto),
  };
}

export function toCategoryInput(state: CategoryFormState): CategoryFormInput {
  return {
    name: state.name,
    slug: state.slug,
    h1: state.h1,
    parentId: state.parentId || null,
    description: state.description,
    // NaN (نه undefined) تا مقدار نامعتبر بی‌صدا به پیش‌فرض ۰ تبدیل نشود
    sortOrder: parseIntegerInput(state.sortOrder) ?? Number.NaN,
    isActive: state.isActive,
    isFeatured: state.isFeatured,
    introText: state.introText,
    bottomContent: state.bottomContent,
    ...toSeoInput(state.seo),
  };
}

/** متن کامل صفحه‌ی دسته برای تحلیل سئو و متای خودکار */
export function categoryText(state: CategoryFormState): string {
  return [state.introText, state.bottomContent]
    .filter((part) => part.trim())
    .join("\n\n");
}

/** خودش و زیردسته‌هایش نمی‌توانند والد باشند (حلقه‌ی درخت) */
export function descendantIds(
  categories: { id: string; parentId: string | null }[],
  rootId: string,
): Set<string> {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const category of categories) {
      if (category.parentId === current && !ids.has(category.id)) {
        ids.add(category.id);
        stack.push(category.id);
      }
    }
  }
  return ids;
}
