export type ImageType = "jpeg" | "png" | "webp";

/**
 * نوع واقعی تصویر از روی magic bytes (نه پسوند یا Content-Type که کلاینت
 * تعیین می‌کند). نوع غیرمجاز یا محتوای غیرتصویری ⇒ `null`.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => bytes[index] === byte)) return "png";
  // WebP: "RIFF" ???? "WEBP"
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
