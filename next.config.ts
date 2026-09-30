import type { NextConfig } from "next";

/**
 * دامنه‌ی تصاویر S3 برای `next/image` (فقط وقتی STORAGE_DRIVER=s3).
 * این مقدار موقع build خوانده می‌شود؛ با تغییر آدرس، دوباره build کنید.
 */
function s3ImagePatterns() {
  if (process.env.STORAGE_DRIVER !== "s3") return [];
  const raw =
    process.env.S3_PUBLIC_URL ||
    (process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET ?? ""}`
      : "");
  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
      },
    ];
  } catch {
    return [];
  }
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP پایه (بخش ۸ سند). اسکریپت‌های درون‌خطی Next (بدون nonce تا کش ISR
 * صفحات حفظ شود) مجازند؛ هیچ منبع خارجی مجاز نیست جز میزبان تصاویر S3 و
 * تصویر نماد اینماد (trustseal.enamad.ir).
 */
function contentSecurityPolicy(): string {
  const imageHosts = s3ImagePatterns().map(
    (p) => `${p.protocol}://${p.hostname}${"port" in p ? `:${p.port}` : ""}`,
  );
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://trustseal.enamad.ir ${imageHosts.join(" ")}`.trim(),
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  // اسلش انتهایی را middleware حذف می‌کند (نه خود Next) تا آدرس قدیمی
  // وردپرسی مثل /product/x/ در یک پرش مستقیم به مقصد نهایی برود (SEO.md §۱۱)
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  images: {
    remotePatterns: s3ImagePatterns(),
    // SEO.md §۹: خروجی AVIF (در صورت پشتیبانی مرورگر) و WebP با اندازه‌ی
    // متناسب با `sizes`؛ نام فایل‌ها تغییرناپذیرند پس کش طولانی امن است.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
