import { describe, expect, it } from "vitest";

import {
  bannerImageUrls,
  DEFAULT_BANNERS,
  MAX_HERO_SLIDES,
  parseBanners,
} from "./banners";
import { bannersSchema } from "./validation/banners";

describe("بنرها و اسلایدر", () => {
  it("مقدار ناقص ⇒ پیش‌فرض؛ اسلایدها حداکثر ۶", () => {
    expect(parseBanners(null)).toEqual(DEFAULT_BANNERS);
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `s${i}` }));
    expect(parseBanners({ heroSlides: many }).heroSlides).toHaveLength(
      MAX_HERO_SLIDES,
    );
    expect(
      parseBanners({ images: { promo: { desktop: "/a.webp" } } }).images,
    ).toMatchObject({ promo: { desktop: "/a.webp", mobile: null } });
  });

  it("همه‌ی آدرس‌های تصویر جمع می‌شوند", () => {
    const settings = parseBanners({
      heroSlides: [{ id: "1", desktop: "/d.webp", mobile: "/m.webp" }],
      images: { story: { desktop: "/s.webp" } },
    });
    expect(bannerImageUrls(settings).sort()).toEqual([
      "/d.webp",
      "/m.webp",
      "/s.webp",
    ]);
  });

  it("اعتبارسنجی: عنوان حداکثر ۲ خط و لینک فقط داخلی", () => {
    const valid = structuredClone(DEFAULT_BANNERS);
    expect(bannersSchema.safeParse(valid).success).toBe(true);

    const bad = structuredClone(DEFAULT_BANNERS);
    bad.heroSlides[0]!.title = "یک\nدو\nسه";
    bad.heroSlides[0]!.ctaHref = "https://evil.example";
    const result = bannersSchema.safeParse(bad);
    const paths = result.error?.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["heroSlides.0.title", "heroSlides.0.ctaHref"]),
    );
    const noSlides = { ...structuredClone(DEFAULT_BANNERS), heroSlides: [] };
    expect(bannersSchema.safeParse(noSlides).success).toBe(false);
    for (const href of ["//evil.example", "/ products"]) {
      const item = structuredClone(DEFAULT_BANNERS);
      item.heroSlides[0]!.ctaHref = href;
      expect(bannersSchema.safeParse(item).success, href).toBe(false);
    }
  });
});
