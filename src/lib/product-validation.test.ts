import { describe, expect, it } from "vitest";

import { sanitizePlainText } from "@/lib/sanitize-text";
import { categoryInputSchema } from "@/lib/validation/category";
import {
  canActivateProduct,
  FIXED_NEEDS_VARIANT_MESSAGE,
  MAX_SERVICE_TERMS_LENGTH,
  NO_PRICE_ACTIVE_MESSAGE,
  productInputSchema,
  resolveServiceTerms,
} from "@/lib/validation/product";

const validVariant = {
  price: 265_000,
  shippingWeightGrams: 700,
};

const validProduct = {
  name: "کپسول یزدی",
  slug: "charge-propane",
  categoryId: "cat-1",
  variants: [validVariant],
};

function issues(input: unknown): Record<string, string> {
  const result = productInputSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

describe("نوع محصول و حالت قیمت (FORK.md §۳.۲)", () => {
  it("پیش‌فرض: کالای فیزیکی و قیمت‌دار", () => {
    const parsed = productInputSchema.parse(validProduct);
    expect(parsed.kind).toBe("PHYSICAL");
    expect(parsed.pricingMode).toBe("FIXED");
    expect(parsed.serviceTerms).toBeNull();
  });

  it("قیمت‌دار بدون متغیر معتبر نیست", () => {
    const errors = issues({ ...validProduct, variants: [] });
    expect(errors.variants).toBe(FIXED_NEEDS_VARIANT_MESSAGE);
    expect(
      issues({ ...validProduct, pricingMode: "FIXED", variants: undefined })
        .variants,
    ).toBe(FIXED_NEEDS_VARIANT_MESSAGE);
  });

  it("استعلامی بدون متغیر معتبر است", () => {
    const parsed = productInputSchema.parse({
      ...validProduct,
      kind: "SERVICE",
      pricingMode: "INQUIRY",
      variants: [],
    });
    expect(parsed.variants).toEqual([]);
    expect(
      productInputSchema.safeParse({
        ...validProduct,
        pricingMode: "INQUIRY",
        variants: undefined,
      }).success,
    ).toBe(true);
  });

  it("مقدار نامعتبر نوع/حالت رد می‌شود و متن شرایط خالی ⇒ null", () => {
    expect(issues({ ...validProduct, kind: "GAS" }).kind).toBeTruthy();
    expect(
      issues({ ...validProduct, pricingMode: "FREE" }).pricingMode,
    ).toBeTruthy();
    const parsed = productInputSchema.parse({
      ...validProduct,
      kind: "SERVICE",
      serviceTerms: "   ",
    });
    expect(parsed.serviceTerms).toBeNull();
    expect(
      issues({
        ...validProduct,
        kind: "SERVICE",
        serviceTerms: "x".repeat(MAX_SERVICE_TERMS_LENGTH + 1),
      }).serviceTerms,
    ).toBeTruthy();
  });

  it("فعال شدن: قیمت‌دار فقط با متغیر فعال؛ استعلامی همیشه", () => {
    expect(
      canActivateProduct({ pricingMode: "FIXED", activeVariantCount: 0 }),
    ).toBe(false);
    expect(
      canActivateProduct({ pricingMode: "FIXED", activeVariantCount: 2 }),
    ).toBe(true);
    expect(
      canActivateProduct({ pricingMode: "INQUIRY", activeVariantCount: 0 }),
    ).toBe(true);
  });

  it("متن شرایط مؤثر: فقط خدمت؛ خالی ⇒ پیش‌فرض؛ فیزیکی ⇒ نادیده", () => {
    const own = { kind: "SERVICE" as const, serviceTerms: " متن اختصاصی " };
    expect(resolveServiceTerms(own, "پیش‌فرض")).toBe("متن اختصاصی");
    expect(
      resolveServiceTerms({ kind: "SERVICE", serviceTerms: null }, "پیش‌فرض"),
    ).toBe("پیش‌فرض");
    expect(
      resolveServiceTerms({ kind: "PHYSICAL", serviceTerms: "x" }, "پیش‌فرض"),
    ).toBeNull();
  });
});

describe("productInputSchema", () => {
  it("ورودی معتبر را می‌پذیرد و رشته‌های خالی را null می‌کند", () => {
    const parsed = productInputSchema.parse({
      ...validProduct,
      slug: " Capsule-Yazdi ",
      shortDescription: "  ",
      description: "",
      variants: [{ ...validVariant, title: "", sku: "", comparePrice: null }],
    });
    expect(parsed.slug).toBe("capsule-yazdi");
    expect(parsed.shortDescription).toBeNull();
    expect(parsed.description).toBeNull();
    expect(parsed.sortOrder).toBe(0);
    expect(parsed.variants[0]).toMatchObject({
      title: null,
      sku: null,
      comparePrice: null,
    });
  });

  it("ورودی قدیمی unitValue نگه داشته نمی‌شود (گزینه‌ها جایگزینش شده‌اند)", () => {
    const parsed = productInputSchema.parse(validProduct);
    expect(Object.keys(parsed.variants[0]!)).not.toContain("unitValue");
    expect(parsed.variants[0]!.selection).toEqual({});
  });

  it("بدون variant ⇒ خطا", () => {
    expect(issues({ ...validProduct, variants: [] }).variants).toBe(
      FIXED_NEEDS_VARIANT_MESSAGE,
    );
  });

  it("هیچ فیلد موجودی پذیرفته یا نگهداری نمی‌شود", () => {
    const parsed = productInputSchema.parse({
      ...validProduct,
      stock: 5,
      inventory: 3,
    });
    expect(Object.keys(parsed).join(" ")).not.toMatch(/stock|inventory/i);
  });

  it("قیمت و وزن باید صحیح و غیرمنفی باشند؛ ترکیب جدیدِ فعال باید قیمت و وزن مثبت داشته باشد", () => {
    const errors = issues({
      ...validProduct,
      variants: [{ price: -1, shippingWeightGrams: 1.5 }],
    });
    expect(errors["variants.0.price"]).toBeDefined();
    expect(errors["variants.0.shippingWeightGrams"]).toBeDefined();

    // بدون قیمت فقط غیرفعال (مثل «ساخت همه‌ی ترکیب‌ها»)
    expect(
      productInputSchema.safeParse({
        ...validProduct,
        variants: [{ price: 0, shippingWeightGrams: 0, isActive: false }],
      }).success,
    ).toBe(true);
    const active = issues({
      ...validProduct,
      variants: [{ price: 0, shippingWeightGrams: 0, isActive: true }],
    });
    expect(active["variants.0.price"]).toBe(NO_PRICE_ACTIVE_MESSAGE);
    expect(active["variants.0.shippingWeightGrams"]).toBeDefined();
  });

  it("ترکیبِ ذخیره‌شده‌ی بدون قیمت هم نمی‌تواند فعال بماند/شود", () => {
    const errors = issues({
      ...validProduct,
      variants: [
        { id: "v1", price: 0, shippingWeightGrams: 500, isActive: true },
      ],
    });
    expect(errors["variants.0.price"]).toBe(NO_PRICE_ACTIVE_MESSAGE);
  });

  it("مقدار ناعدد پیام فارسی همان فیلد را می‌دهد", () => {
    const errors = issues({
      ...validProduct,
      variants: [{ price: Number.NaN, shippingWeightGrams: 700 }],
    });
    expect(errors["variants.0.price"]).toBe("قیمت باید عدد صحیح باشد");
  });

  it("قیمت قبل از تخفیف باید از قیمت بیشتر باشد", () => {
    const errors = issues({
      ...validProduct,
      variants: [{ ...validVariant, comparePrice: 265_000 }],
    });
    expect(errors["variants.0.comparePrice"]).toBe(
      "قیمت قبل از تخفیف باید بیشتر از قیمت باشد",
    );
  });

  it("نام کوتاه، واحد نامعتبر و slug نامعتبر ⇒ خطا", () => {
    const errors = issues({
      ...validProduct,
      name: "ب",
      unit: "KG",
      slug: "bad slug",
    });
    expect(errors.name).toBeDefined();
    expect(errors.unit).toBeDefined();
    expect(errors.slug).toBeDefined();
  });

  it("نامک خالی یا فارسی ⇒ خطا (نامک لاتین الزامی)", () => {
    expect(issues({ ...validProduct, slug: "" }).slug).toContain("انگلیسی");
    expect(issues({ ...validProduct, slug: "کپسول" }).slug).toBeDefined();
    expect(
      issues({ ...validProduct, slug: "a".repeat(61) }).slug,
    ).toBeDefined();
  });

  it("فیلدهای سئو: پیش‌فرض‌ها، کلمات ثانویه‌ی یکتا، FAQ و canonical", () => {
    const parsed = productInputSchema.parse({
      ...validProduct,
      secondaryKeywords: ["کپسول", "کپسول", " "],
      faq: [{ question: "چقدر می‌ماند؟", answer: "تا دو هفته." }],
      canonicalUrl: "/products/x",
    });
    expect(parsed).toMatchObject({
      noindex: false,
      secondaryKeywords: ["کپسول"],
      faq: [{ question: "چقدر می‌ماند؟", answer: "تا دو هفته." }],
      canonicalUrl: "/products/x",
      focusKeyword: null,
    });
    expect(
      issues({ ...validProduct, canonicalUrl: "javascript:alert(1)" })
        .canonicalUrl,
    ).toBeDefined();
    expect(
      issues({ ...validProduct, faq: [{ question: "", answer: "x" }] })[
        "faq.0.question"
      ],
    ).toBeDefined();
  });

  it("بیش از ۳۰ متغیر ⇒ خطا", () => {
    const many = Array.from({ length: 31 }, (_, i) => ({
      ...validVariant,
      unitValue: i + 1,
    }));
    expect(issues({ ...validProduct, variants: many }).variants).toBeDefined();
  });
});

describe("categoryInputSchema", () => {
  it("ورودی معتبر", () => {
    const parsed = categoryInputSchema.parse({
      name: "کپسول",
      slug: "capsule",
      parentId: "",
      bottomContent: "## عنوان\nمتن",
    });
    expect(parsed).toMatchObject({
      name: "کپسول",
      parentId: null,
      slug: "capsule",
      sortOrder: 0,
      introText: null,
      bottomContent: "## عنوان\nمتن",
      noindex: false,
      faq: [],
    });
  });

  it("نام کوتاه ⇒ خطا", () => {
    expect(
      categoryInputSchema.safeParse({ name: "ب", slug: "b" }).success,
    ).toBe(false);
  });
});

describe("sanitizePlainText", () => {
  it("تگ‌ها و محتوای script را حذف می‌کند", () => {
    expect(sanitizePlainText("سلام <b>دنیا</b><script>alert(1)</script>")).toBe(
      "سلام دنیا",
    );
    expect(sanitizePlainText('<img src=x onerror="alert(1)">متن')).toBe("متن");
  });

  it("بریدگی خط و پاراگراف را حفظ می‌کند و خطوط خالی اضافه را کم می‌کند", () => {
    expect(sanitizePlainText("خط اول\r\nخط دوم\n\n\n\nپاراگراف")).toBe(
      "خط اول\nخط دوم\n\nپاراگراف",
    );
  });

  it("کاراکترهای < و & معمولی را نگه می‌دارد", () => {
    expect(sanitizePlainText("قیمت < ۵۰ & بیشتر")).toBe("قیمت < ۵۰ & بیشتر");
  });

  it("خالی ⇒ null", () => {
    expect(sanitizePlainText("")).toBeNull();
    expect(sanitizePlainText("   ")).toBeNull();
    expect(sanitizePlainText(null)).toBeNull();
    expect(sanitizePlainText("<p></p>")).toBeNull();
  });
});

describe("categoryInputSchema: نمایش در صفحه‌ی اصلی", () => {
  const category = { name: "شارژ کپسول گاز", slug: "lpg-charge" };

  it("isFeatured اختیاری است (undefined ⇒ دست‌نخورده)", () => {
    expect(categoryInputSchema.parse(category).isFeatured).toBeUndefined();
    expect(
      categoryInputSchema.parse({ ...category, isFeatured: true }).isFeatured,
    ).toBe(true);
    expect(
      categoryInputSchema.safeParse({ ...category, isFeatured: "yes" }).success,
    ).toBe(false);
  });
});
