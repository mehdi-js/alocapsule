import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { getAuthSecret } from "@/lib/env";

/**
 * رمزنگاری مقادیر محرمانه‌ای که در دیتابیس ذخیره می‌شوند (مثل رمز/ApiKey
 * ملی پیامک): AES-256-GCM با کلیدی مشتق از `AUTH_SECRET`. بکاپ دیتابیس به‌تنهایی
 * رمز را لو نمی‌دهد. تغییر `AUTH_SECRET` ⇒ مقدار قبلی قابل خواندن نیست و باید
 * دوباره وارد شود. قالب: `v1.<iv>.<tag>.<data>` (base64url).
 */

const VERSION = "v1";

function key(): Buffer {
  return createHash("sha256")
    .update(`alihan-settings-secret:${getAuthSecret()}`)
    .digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

/** مقدار نامعتبر یا رمزشده با AUTH_SECRET دیگر ⇒ `null` */
export function decryptSecret(sealed: string): string | null {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
