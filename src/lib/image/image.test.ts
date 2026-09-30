import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  MAIN_IMAGE_SIZE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  THUMB_IMAGE_SIZE,
} from "./config";
import { processProductImage } from "./process";
import { detectImageType } from "./sniff";
import {
  ogImageKey,
  productImageBaseName,
  productImageFileKeys,
  productImageKeys,
  publicMediaContentType,
  thumbnailKey,
  thumbnailUrl,
} from "./urls";

async function makeImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp",
  orientation?: number,
) {
  let pipeline = sharp({
    create: { width, height, channels: 3, background: "#c0392b" },
  });
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  return pipeline[format]().toBuffer();
}

describe("detectImageType (magic bytes)", () => {
  it("jpeg, png و webp واقعی را تشخیص می‌دهد", async () => {
    expect(detectImageType(await makeImage(8, 8, "jpeg"))).toBe("jpeg");
    expect(detectImageType(await makeImage(8, 8, "png"))).toBe("png");
    expect(detectImageType(await makeImage(8, 8, "webp"))).toBe("webp");
  });

  it("محتوای غیرتصویری را با هر پسوندی رد می‌کند", () => {
    expect(detectImageType(Buffer.from("این یک فایل متنی است"))).toBeNull();
    expect(detectImageType(Buffer.from("<?php echo 1; ?>"))).toBeNull();
    expect(detectImageType(Buffer.from("<svg xmlns='x'></svg>"))).toBeNull();
    expect(detectImageType(Buffer.from("MZ\x90\x00"))).toBeNull(); // exe
    expect(detectImageType(new Uint8Array())).toBeNull();
  });

  it("فرمت‌های غیرمجاز (GIF) را رد می‌کند", () => {
    expect(detectImageType(Buffer.from("GIF89a\x01\x00\x01\x00"))).toBeNull();
  });

  it("RIFF بدون WEBP (مثلاً WAV) را رد می‌کند", () => {
    const wav = Buffer.from("RIFF\x24\x00\x00\x00WAVEfmt ");
    expect(detectImageType(wav)).toBeNull();
  });
});

describe("processProductImage", () => {
  it("تصویر بزرگ را تا ۱۶۰۰px کوچک و thumbnail ۴۰۰px می‌سازد (WebP)", async () => {
    const input = await makeImage(3000, 2000, "jpeg");
    const result = await processProductImage(input);

    const main = await sharp(result.main).metadata();
    const thumb = await sharp(result.thumb).metadata();
    expect(main.format).toBe("webp");
    expect(main.width).toBe(MAIN_IMAGE_SIZE);
    expect(main.height).toBe(1067);
    expect(thumb.format).toBe("webp");
    expect(thumb.width).toBe(THUMB_IMAGE_SIZE);
    expect(result.width).toBe(MAIN_IMAGE_SIZE);
    expect(result.height).toBe(1067);
    expect(result.main.length).toBeLessThan(input.length);
  });

  it("برش OG دقیقاً ۱۲۰۰×۶۳۰ و JPEG است (حتی از تصویر کوچک یا عمودی)", async () => {
    for (const input of [
      await makeImage(3000, 2000, "jpeg"),
      await makeImage(300, 900, "png"),
    ]) {
      const { og } = await processProductImage(input);
      const meta = await sharp(og).metadata();
      expect(meta.format).toBe("jpeg");
      expect([meta.width, meta.height]).toEqual([
        OG_IMAGE_WIDTH,
        OG_IMAGE_HEIGHT,
      ]);
    }
  });

  it("تصویر کوچک را بزرگ نمی‌کند", async () => {
    const result = await processProductImage(await makeImage(100, 60, "png"));
    const main = await sharp(result.main).metadata();
    expect([main.width, main.height]).toEqual([100, 60]);
  });

  it("جهت EXIF را اعمال می‌کند و متادیتا را حذف می‌کند", async () => {
    // ۲۰۰×۱۰۰ با orientation=6 (۹۰ درجه) ⇒ باید ۱۰۰×۲۰۰ شود
    const input = await makeImage(200, 100, "jpeg", 6);
    expect((await sharp(input).metadata()).orientation).toBe(6);

    const result = await processProductImage(input);
    const main = await sharp(result.main).metadata();
    expect([main.width, main.height]).toEqual([100, 200]);
    expect(main.exif).toBeUndefined();
    expect(main.orientation).toBeUndefined();
  });

  it("فایل با magic bytes درست ولی محتوای خراب ⇒ خطا", async () => {
    const valid = await makeImage(50, 50, "jpeg");
    const corrupted = Buffer.concat([
      valid.subarray(0, 20),
      Buffer.from("garbage-garbage-garbage"),
    ]);
    await expect(processProductImage(corrupted)).rejects.toThrow();
    await expect(
      processProductImage(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])),
    ).rejects.toThrow();
  });
});

describe("نام‌گذاری فایل‌ها (SEO.md §۹)", () => {
  it("{نامک}-{ردیف}-{۴ نویسه} با thumbnail و OG", () => {
    const base = productImageBaseName("baklava-gerdouyi", 1, "a3f9");
    expect(base).toBe("baklava-gerdouyi-1-a3f9");
    expect(productImageKeys(base)).toEqual({
      main: "products/baklava-gerdouyi-1-a3f9.webp",
      thumb: "products/baklava-gerdouyi-1-a3f9-thumb.webp",
      og: "products/baklava-gerdouyi-1-a3f9-og.jpg",
    });
  });

  it("نامک غیرلاتین (قدیمی) ⇒ product", () => {
    expect(productImageBaseName("سوتلاوا", 2, "00ff")).toBe("product-2-00ff");
  });

  it("thumbnail و OG از روی آدرس/کلید اصلی", () => {
    expect(thumbnailUrl("/api/media/products/x-1-abcd.webp")).toBe(
      "/api/media/products/x-1-abcd-thumb.webp",
    );
    expect(thumbnailKey("products/x-1-abcd.webp")).toBe(
      "products/x-1-abcd-thumb.webp",
    );
    expect(ogImageKey("products/x-1-abcd.webp")).toBe(
      "products/x-1-abcd-og.jpg",
    );
    expect(productImageFileKeys("products/x-1-abcd.webp")).toHaveLength(3);
    expect(thumbnailUrl("/x/y.jpg")).toBe("/x/y.jpg");
  });
});

describe("publicMediaContentType (فقط فایل‌های عمومی)", () => {
  it.each([
    ["products/baklava-gerdouyi-1-a3f9.webp", "image/webp"],
    ["products/baklava-gerdouyi-1-a3f9-thumb.webp", "image/webp"],
    ["products/baklava-gerdouyi-1-a3f9-og.jpg", "image/jpeg"],
    ["products/0f8fad5b-d9cb-469f-a165-70867728950e.webp", "image/webp"],
    ["banners/0f8fad5b-d9cb-469f-a165-70867728950e.webp", "image/webp"],
  ])("%s ⇒ %s", (key, type) => {
    expect(publicMediaContentType(key)).toBe(type);
  });

  it.each([
    "receipts/0f8fad5b-d9cb-469f-a165-70867728950e.webp",
    "products/../receipts/x.webp",
    "products/Baklava-1-a3f9.webp",
    "products/x-1-a3f9.png",
    "private/x.webp",
  ])("%s ⇒ ۴۰۴", (key) => {
    expect(publicMediaContentType(key)).toBeNull();
  });
});
