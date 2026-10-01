"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { TitleSettings } from "@/lib/seo/title";
import { toPersianDigits } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/product";
import type { CategoryDto } from "@/server/services/category.service";
import type { ProductEditDto } from "@/server/services/product-query.service";

import { OptionsSection } from "./OptionsSection";
import { PricingSection } from "./PricingSection";
import {
  autoSlug,
  emptyProductForm,
  formFromDto,
  type ProductFormState,
  toProductInput,
} from "./product-form-state";
import { ProductActiveCard } from "./ProductActiveCard";
import { ProductBasicsSection } from "./ProductBasicsSection";
import { RichTextField } from "./seo/RichTextField";
import { SeoSection } from "./seo/SeoSection";

const sectionClass =
  "space-y-4 rounded-xl border border-neutral-200 bg-white p-5";

export function ProductForm({
  categories,
  product,
  images,
  titleSettings,
  siteUrl,
  defaultServiceTerms,
  pairingOptions,
}: {
  categories: CategoryDto[];
  /** اگر باشد حالت ویرایش است */
  product?: ProductEditDto;
  /** تصاویر فعلی (برای تحلیل سئو)؛ محصول جدید هنوز تصویری ندارد */
  images: { alt: string; isPrimary: boolean }[];
  titleSettings: TitleSettings;
  siteUrl: string;
  /** متن پیش‌فرض شرایط خدمت (`service.defaultTerms`) برای placeholder */
  defaultServiceTerms: string;
  /** محصولات قابل انتخاب به‌عنوان «محصول متناظر» */
  pairingOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ProductFormState>(() =>
    product ? formFromDto(product) : emptyProductForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mode = product ? "edit" : "create";
  const unitLocked = product?.hasOrders ?? false;
  // فقط متغیرهای فعلیِ فعال؛ با استعلامی شدن غیرفعال می‌شوند
  const originalVariantCount =
    product?.variants.filter((variant) => variant.isActive).length ?? 0;

  function patch(update: Partial<ProductFormState>) {
    setState((current) => ({ ...current, ...update }));
  }

  function changeName(name: string) {
    patch({ name, ...(state.slugTouched ? {} : { slug: autoSlug(name) }) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const input = toProductInput(state, mode);
      const result = product
        ? await updateProductAction(product.id, input)
        : await createProductAction(input);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      if (result.seoWarning) toast.error(result.seoWarning);
      if (result.deactivatedVariants > 0) {
        toast.success(
          `${toPersianDigits(result.deactivatedVariants)} متغیر به‌خاطر استعلامی شدن محصول غیرفعال شد (حذف نشد).`,
        );
      }
      if (product) {
        toast.success("تغییرات ذخیره شد.");
        router.push("/admin/products");
      } else {
        // تصاویر به محصول ذخیره‌شده وصل می‌شوند؛ ادمین را به صفحه‌ی ویرایش می‌بریم.
        toast.success("محصول ساخته شد. اکنون تصاویر را اضافه کنید.");
        router.push(`/admin/products/${result.id}/edit`);
      }
      router.refresh();
    });
  }

  const error = (field: string) => errors[field];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <ProductActiveCard
        product={product}
        isActive={state.isActive}
        onChange={(isActive) => patch({ isActive })}
      />

      <ProductBasicsSection
        state={state}
        categories={categories}
        originalSlug={product?.slug ?? null}
        unitLocked={unitLocked}
        error={error}
        onName={changeName}
        onChange={patch}
      />

      {state.kind === "SERVICE" ? (
        <section className={sectionClass}>
          <h2 className="text-lg font-bold">شرایط خدمت</h2>
          <RichTextField
            id="serviceTerms"
            label="شرایط شارژ و تعویض (اختصاصی این محصول)"
            rows={8}
            headingLevel={3}
            value={state.serviceTerms}
            error={error("serviceTerms")}
            placeholder={defaultServiceTerms}
            hint="خالی بگذارید تا متن پیش‌فرض (تنظیمات ← کسب‌وکار و خدمت) نمایش داده شود. متن پذیرفته‌شده هنگام سفارش عیناً در سفارش ذخیره می‌شود."
            onChange={(serviceTerms) => patch({ serviceTerms })}
          />
        </section>
      ) : null}

      {state.pricingMode === "INQUIRY" ? (
        <section className={sectionClass}>
          <h2 className="text-lg font-bold">محصول استعلامی</h2>
          <p className="text-sm text-neutral-600">
            این محصول متغیر و قیمت ندارد؛ در فروشگاه به‌جای قیمت «استعلام قیمت»
            با دکمه‌ی تماس نمایش داده می‌شود و افزودن به سبد ندارد.
          </p>
          {product && originalVariantCount > 0 ? (
            <p
              role="alert"
              className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              هشدار: با ذخیره، {toPersianDigits(originalVariantCount)} ترکیب
              فعلی این محصول غیرفعال می‌شود (حذف نمی‌شوند) و از سبد مشتریانی که
              آن را دارند برداشته می‌شود.
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className={sectionClass}>
            <div>
              <h2 className="text-lg font-bold">گزینه‌ها</h2>
              <p className="text-sm text-neutral-600">
                گروه‌هایی مثل «نوع شیر (پرسی/بوتان)» یا «وضعیت تحویل
                (خالی/پرشده)». هر ترکیب از مقدارها یک قیمت مستقل دارد.
              </p>
            </div>
            <OptionsSection
              options={state.options}
              variants={state.variants}
              codesLocked={product?.hasOrders ?? false}
              error={error}
              onChange={(next) => patch(next)}
            />
          </section>
          <section className={sectionClass}>
            <div>
              <h2 className="text-lg font-bold">قیمت‌گذاری ترکیب‌ها</h2>
              <p className="text-sm text-neutral-600">
                مشتری یک ترکیب را انتخاب می‌کند و در سبد تعداد آن را تعیین
                می‌کند. ترکیب بدون قیمت فعال نمی‌شود.
              </p>
            </div>
            <PricingSection
              options={state.options}
              rows={state.variants}
              errors={errors}
              priceUpdatedAt={product?.priceUpdatedAt ?? null}
              paired={product?.paired ?? null}
              pairedProductId={state.pairedProductId}
              pairingOptions={pairingOptions}
              onRows={(variants) => patch({ variants })}
              onPairedChange={(pairedProductId) => patch({ pairedProductId })}
            />
          </section>
        </>
      )}

      <SeoSection
        state={state.seo}
        onChange={(update) =>
          setState((current) => ({
            ...current,
            seo: { ...current.seo, ...update },
          }))
        }
        error={error}
        context={{
          kind: "product",
          id: product?.id ?? null,
          categoryId: state.categoryId || null,
          name: state.name,
          path: `/products/${state.slug.trim()}`,
          text: state.description,
          images,
          titleSettings,
          siteUrl,
        }}
      >
        <Field
          label="آدرس canonical (پیشرفته)"
          htmlFor="canonicalUrl"
          error={error("canonicalUrl")}
          hint="معمولاً خالی بماند؛ فقط اگر این صفحه نسخه‌ی تکراری صفحه‌ی دیگری است."
        >
          <Input
            id="canonicalUrl"
            dir="ltr"
            value={state.canonicalUrl}
            invalid={!!error("canonicalUrl")}
            onChange={(event) => patch({ canonicalUrl: event.target.value })}
          />
        </Field>
      </SeoSection>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Link href="/admin/products" className={buttonClasses("secondary")}>
          انصراف
        </Link>
        <Button type="submit" loading={isPending}>
          {isPending
            ? "در حال ذخیره…"
            : product
              ? "ذخیره‌ی تغییرات"
              : "ساخت محصول"}
        </Button>
      </div>
    </form>
  );
}
