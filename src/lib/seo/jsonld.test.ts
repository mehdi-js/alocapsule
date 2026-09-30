import { describe, expect, it } from "vitest";

import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  localBusinessJsonLd,
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

describe("localBusinessJsonLd", () => {
  it("آدرس، تلفن E.164، مختصات و ساعات؛ بدون مختصات ⇒ بدون geo", () => {
    const base = {
      siteUrl: SITE,
      brandName: "الو کپسول",
      name: "شعبه ولیعصر",
      slug: "valiasr",
      city: "تهران",
      district: "ونک",
      address: "خیابان ولیعصر، پلاک ۱",
      phone: "۰۲۱-۲۲۳۴۵۶۷۸",
      latitude: 35.75,
      longitude: 51.41,
      image: null,
      mapUrl: "https://neshan.org/maps/x",
      openingHours: [{ "@type": "OpeningHoursSpecification" }],
    };
    const data = localBusinessJsonLd(base);
    expect(data).toMatchObject({
      "@type": "LocalBusiness",
      name: "الو کپسول — شعبه ولیعصر",
      url: "https://alocapsule.ir/branches/valiasr",
      telephone: "+982122345678",
      address: {
        addressLocality: "ونک",
        addressRegion: "تهران",
        addressCountry: "IR",
      },
      geo: { latitude: 35.75, longitude: 51.41 },
      hasMap: "https://neshan.org/maps/x",
    });
    expect(
      localBusinessJsonLd({ ...base, latitude: null }).geo,
    ).toBeUndefined();
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
