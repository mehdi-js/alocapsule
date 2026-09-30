import { describe, expect, it } from "vitest";

import { sanitizePlainText } from "@/lib/sanitize-text";
import { categoryInputSchema } from "@/lib/validation/category";
import { productInputSchema } from "@/lib/validation/product";

const validVariant = {
  unitValue: 500,
  price: 265_000,
  shippingWeightGrams: 700,
};

const validProduct = {
  name: "باقلوا یزدی",
  slug: "baklava-yazdi",
  categoryId: "cat-1",
  unit: "GRAM" as const,
  variants: [validVariant],
};

function issues(input: unknown): Record<string, string> {
  const result = productInputSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

describe("productInputSchema", () => {
  it("ورودی معتبر را می‌پذیرد و رشته‌های خالی را null می‌کند", () => {
    const parsed = productInputSchema.parse({
      ...validProduct,
      slug: " Baklava-Yazdi ",
      shortDescription: "  ",
      description: "",
      variants: [{ ...validVariant, title: "", sku: "", comparePrice: null }],
    });
    expect(parsed.slug).toBe("baklava-yazdi");
    expect(parsed.shortDescription).toBeNull();
    expect(parsed.description).toBeNull();
    expect(parsed.sortOrder).toBe(0);
    expect(parsed.variants[0]).toMatchObject({
      title: null,
      sku: null,
      comparePrice: null,
    });
  });

  it("دو variant با unitValue یکسان ⇒ خطا روی همان ردیف", () => {
    const errors = issues({
      ...validProduct,
      variants: [validVariant, { ...validVariant, price: 300_000 }],
    });
    expect(errors["variants.1.unitValue"]).toBe("مقدار واحد تکراری است");
  });

  it("بدون variant ⇒ خطا", () => {
    expect(issues({ ...validProduct, variants: [] }).variants).toBe(
      "حداقل یک متغیر لازم است",
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

  it("قیمت و وزن باید مثبت و صحیح باشند", () => {
    const errors = issues({
      ...validProduct,
      variants: [{ unitValue: 0, price: 0, shippingWeightGrams: 1.5 }],
    });
    expect(errors["variants.0.unitValue"]).toBeDefined();
    expect(errors["variants.0.price"]).toBeDefined();
    expect(errors["variants.0.shippingWeightGrams"]).toBeDefined();
  });

  it("مقدار ناعدد پیام فارسی همان فیلد را می‌دهد", () => {
    const errors = issues({
      ...validProduct,
      variants: [
        { unitValue: undefined, price: Number.NaN, shippingWeightGrams: 700 },
      ],
    });
    expect(errors["variants.0.unitValue"]).toBe(
      "مقدار واحد باید عدد صحیح باشد",
    );
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
    expect(issues({ ...validProduct, slug: "باقلوا" }).slug).toBeDefined();
    expect(
      issues({ ...validProduct, slug: "a".repeat(61) }).slug,
    ).toBeDefined();
  });

  it("فیلدهای سئو: پیش‌فرض‌ها، کلمات ثانویه‌ی یکتا، FAQ و canonical", () => {
    const parsed = productInputSchema.parse({
      ...validProduct,
      secondaryKeywords: ["باقلوا", "باقلوا", " "],
      faq: [{ question: "چقدر می‌ماند؟", answer: "تا دو هفته." }],
      canonicalUrl: "/products/x",
    });
    expect(parsed).toMatchObject({
      noindex: false,
      secondaryKeywords: ["باقلوا"],
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
      name: "باقلوا",
      slug: "baklava",
      parentId: "",
      bottomContent: "## عنوان\nمتن",
    });
    expect(parsed).toMatchObject({
      name: "باقلوا",
      parentId: null,
      slug: "baklava",
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
