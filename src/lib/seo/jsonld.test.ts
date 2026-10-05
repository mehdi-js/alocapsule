import { describe, expect, it } from "vitest";

import {
  breadcrumbJsonLd,
  businessLocationJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  organizationJsonLd,
  productJsonLd,
  type ProductJsonLdInput,
  toE164,
  tomanToRial,
} from "./jsonld";
import { todo } from "./settings";

const SITE = "https://alocapsule.ir";

function product(overrides: Partial<ProductJsonLdInput> = {}) {
  return productJsonLd({
    siteUrl: SITE,
    brandName: "الو کپسول",
    name: "شارژ بوتان",
    slug: "charge-butane",
    description: "## عنوان\nمتن [لینک](/a) توضیحات",
    categoryName: "کپسول",
    images: ["/api/media/products/charge-butane-1-a3f9.webp"],
    variants: [
      { price: 1_200_000, sku: null },
      { price: 4_400_000, sku: null },
    ],
    available: true,
    ...overrides,
  });
}

describe("tomanToRial", () => {
  it("تومان × ۱۰، رشته‌ی ارقام لاتین بدون جداکننده", () => {
    expect(tomanToRial(1_200_000)).toBe("12000000");
    expect(tomanToRial(135_000)).toBe("1350000");
    expect(tomanToRial(0)).toBe("0");
  });
});

describe("productJsonLd", () => {
  it("چند متغیر ⇒ AggregateOffer با IRR و قیمت × ۱۰", () => {
    const data = product();
    expect(data.offers).toEqual({
      "@type": "AggregateOffer",
      priceCurrency: "IRR",
      lowPrice: "12000000",
      highPrice: "44000000",
      offerCount: 2,
      availability: "https://schema.org/InStock",
      url: "https://alocapsule.ir/products/charge-butane",
    });
    expect(data.image).toEqual([
      "https://alocapsule.ir/api/media/products/charge-butane-1-a3f9.webp",
    ]);
    expect(data.brand).toEqual({ "@type": "Brand", name: "الو کپسول" });
    // توضیحات بدون نشانه‌گذاری
    expect(data.description).toBe("عنوان متن لینک توضیحات");
  });

  it("یک متغیر ⇒ Offer با price؛ غیرفعال ⇒ OutOfStock", () => {
    const data = product({
      variants: [{ price: 500_000, sku: "BK-1" }],
      available: false,
    });
    expect(data.offers).toMatchObject({
      "@type": "Offer",
      price: "5000000",
      priceCurrency: "IRR",
      availability: "https://schema.org/OutOfStock",
    });
    expect(data.sku).toBe("BK-1");
  });

  it("بدون متغیر ⇒ بدون offers؛ هرگز aggregateRating/review", () => {
    const data = product({ variants: [] });
    expect(data.offers).toBeUndefined();
    const json = JSON.stringify(product());
    expect(json).not.toContain("aggregateRating");
    expect(json).not.toContain("review");
  });
});

describe("organizationJsonLd", () => {
  it("جای‌نگهدار وارد schema نمی‌شود؛ تلفن E.164", () => {
    const data = organizationJsonLd({
      siteUrl: SITE,
      brandName: "الو کپسول",
      alternateNames: ["الو کپسول", "AloCapsule"],
      legalName: todo("نام حقوقی"),
      logoUrl: "/brand/logo-white.webp",
      phone: "۰۲۱-۲۲۳۴۵۶۷۸",
      email: "info@alocapsule.ir",
      sameAs: ["https://instagram.com/alocapsule"],
    });
    expect(data.legalName).toBeUndefined();
    expect(data.logo).toBe("https://alocapsule.ir/brand/logo-white.webp");
    expect(data.contactPoint).toMatchObject({ telephone: "+982122345678" });
    expect(data.alternateName).toEqual(["الو کپسول", "AloCapsule"]);
  });

  it("toE164", () => {
    expect(toE164("09121234567")).toBe("+989121234567");
    expect(toE164("+98 21 1234")).toBe("+98211234");
    expect(toE164("")).toBeUndefined();
  });
});

describe("breadcrumb، ItemList و FAQPage", () => {
  it("آدرس‌های مطلق و ترتیب", () => {
    const data = breadcrumbJsonLd(
      [
        { name: "خانه", path: "/" },
        { name: "کپسول", path: "/category/capsule" },
      ],
      SITE,
    );
    expect(data.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "خانه",
        item: "https://alocapsule.ir/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "کپسول",
        item: "https://alocapsule.ir/category/capsule",
      },
    ]);
    expect(
      itemListJsonLd([{ name: "x", path: "/products/x" }], SITE)
        .itemListElement,
    ).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "x",
        url: "https://alocapsule.ir/products/x",
      },
    ]);
  });

  it("FAQ جای‌نگهدار حذف؛ همه جای‌نگهدار ⇒ null", () => {
    expect(
      faqPageJsonLd([
        { question: "س۱", answer: todo() },
        { question: "س۲", answer: "پاسخ واقعی" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "س۲",
          acceptedAnswer: { "@type": "Answer", text: "پاسخ واقعی" },
        },
      ],
    });
    expect(faqPageJsonLd([{ question: "س", answer: todo() }])).toBeNull();
  });
});

describe("productJsonLd: محصول استعلامی", () => {
  it("🔴 بدون قیمت (variants خالی) ⇒ offers تولید نمی‌شود", () => {
    const data = productJsonLd({
      siteUrl: "https://alocapsule.ir",
      brandName: "الو کپسول",
      name: "شارژ کپسول اکسیژن",
      slug: "charge-oxygen-40kg",
      description: null,
      categoryName: "سایر گازها",
      images: [],
      variants: [],
      available: true,
    });
    expect(data.offers).toBeUndefined();
    expect(data["@type"]).toBe("Product");
  });
});

describe("productJsonLd: ترکیب‌های هم‌قیمت و بی‌قیمت (SEO.md §۶.۲)", () => {
  it("همه‌ی ترکیب‌ها یک قیمت (شارژ: پرسی و بوتان) ⇒ Offer ساده", () => {
    const data = product({
      variants: [
        { price: 3_850_000, sku: null },
        { price: 3_850_000, sku: null },
      ],
    });
    expect(data.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "IRR",
      price: "38500000",
    });
    expect(data.offers).not.toHaveProperty("lowPrice");
  });

  it("خرید ۵۰: AggregateOffer با low/high از ترکیب‌های فعال و offerCount", () => {
    const data = product({
      variants: [
        { price: 15_000_000, sku: null },
        { price: 18_850_000, sku: null },
      ],
    });
    expect(data.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "150000000",
      highPrice: "188500000",
      offerCount: 2,
    });
  });

  it("🔴 ترکیب بدون قیمت (۰) هرگز offer نمی‌سازد", () => {
    expect(
      product({ variants: [{ price: 0, sku: null }], available: false }).offers,
    ).toBeUndefined();
    expect(
      product({
        variants: [
          { price: 0, sku: null },
          { price: 5_000, sku: null },
        ],
      }).offers,
    ).toMatchObject({ "@type": "Offer", price: "50000" });
    const json = JSON.stringify(product());
    expect(json).not.toMatch(/aggregateRating|"review"/);
  });
});

describe("businessLocationJsonLd (SEO.md §۶.۱)", () => {
  const base = {
    siteUrl: SITE,
    brandName: "الو کپسول",
    alternateNames: ["Alo Capsule", "الوکپسول", "alocapsule"],
    description: "تأمین، شارژ و ارسال کپسول گاز مایع (LPG)",
    phone: "09126270595",
    email: "info@alocapsule.ir",
    streetAddress: "کوهسار، میدان بهاران، اول جاده سولقان",
    city: "تهران",
  };

  it("LocalBusiness با آدرس، تلفن E.164 و areaServed شهر تهران", () => {
    const data = businessLocationJsonLd(base);
    expect(data).toMatchObject({
      "@type": "LocalBusiness",
      name: "الو کپسول",
      alternateName: ["Alo Capsule", "الوکپسول", "alocapsule"],
      telephone: "+989126270595",
      email: "info@alocapsule.ir",
      areaServed: { "@type": "City", name: "تهران" },
      address: {
        addressCountry: "IR",
        addressRegion: "تهران",
        addressLocality: "تهران",
        streetAddress: "کوهسار، میدان بهاران، اول جاده سولقان",
      },
    });
  });

  it("🔴 جای‌نگهدار و ساعات کاری نامشخص هرگز وارد JSON-LD نمی‌شوند", () => {
    const data = businessLocationJsonLd({
      ...base,
      email: todo("ایمیل"),
      streetAddress: todo("آدرس"),
    });
    const json = JSON.stringify(data);
    expect(json).not.toContain("{{");
    // کلید با مقدار undefined در JSON نمی‌آید
    expect(json).not.toContain("openingHoursSpecification");
    expect(json).not.toContain('"geo"');
    expect(data.email).toBeUndefined();
    expect(
      (data.address as Record<string, unknown>).streetAddress,
    ).toBeUndefined();
  });

  it("ساعات و مختصات واقعی (اگر باشد) اضافه می‌شود", () => {
    const data = businessLocationJsonLd({
      ...base,
      latitude: 35.8,
      longitude: 51.3,
      openingHours: [{ "@type": "OpeningHoursSpecification", opens: "09:00" }],
    });
    expect(data.geo).toMatchObject({ latitude: 35.8, longitude: 51.3 });
    expect(data.openingHoursSpecification).toHaveLength(1);
  });
});

describe("organizationJsonLd: تگ‌لاین برند", () => {
  it("description از تگ‌لاین؛ جای‌نگهدار حذف", () => {
    const data = organizationJsonLd({
      siteUrl: SITE,
      brandName: "الو کپسول",
      alternateNames: [],
      description: "تأمین، شارژ و ارسال کپسول گاز مایع (LPG)",
      legalName: null,
      logoUrl: null,
      phone: null,
      email: null,
      sameAs: [],
    });
    expect(data.description).toBe("تأمین، شارژ و ارسال کپسول گاز مایع (LPG)");
  });
});
