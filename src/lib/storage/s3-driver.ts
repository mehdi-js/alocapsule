import { AwsClient } from "aws4fetch";

import { assertValidKey } from "./keys";
import type { StorageDriver, StoragePutParams } from "./types";

const REQUEST_TIMEOUT_MS = 30_000;
/** فایل‌ها با نام uuid و تغییرناپذیرند */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export interface S3Config {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  /** برای امضای SigV4 لازم است؛ اکثر سرویس‌های S3-compatible هر مقداری را می‌پذیرند */
  region?: string;
  /** پایه‌ی آدرس عمومی (دامین CDN یا virtual-host)؛ پیش‌فرض: `endpoint/bucket` */
  publicUrl?: string;
  fetchImpl?: typeof fetch;
}

function trimSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * ذخیره روی سرویس S3-compatible (آروان) با امضای SigV4 روی `fetch`
 * (کتابخانه‌ی aws4fetch). آدرس‌دهی path-style: `endpoint/bucket/key`.
 * دسترسی خواندن عمومی باید روی خود bucket تنظیم شود.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3" as const;
  private readonly client: AwsClient;
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: S3Config) {
    this.endpoint = trimSlashes(config.endpoint);
    this.bucket = config.bucket;
    this.publicBase = trimSlashes(
      config.publicUrl || `${this.endpoint}/${config.bucket}`,
    );
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.client = new AwsClient({
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
      service: "s3",
      region: config.region || "us-east-1",
    });
  }

  private objectUrl(key: string): string {
    assertValidKey(key);
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  /** امضای SigV4 و ارسال؛ بدون retry خودکار (خطا به فراخواننده می‌رسد). */
  private async send(key: string, init: RequestInit): Promise<Response> {
    const signed = await this.client.sign(this.objectUrl(key), {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return this.fetchImpl(signed);
  }

  async put({ key, body, contentType }: StoragePutParams): Promise<void> {
    const response = await this.send(key, {
      method: "PUT",
      body: new Uint8Array(body),
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        // بدون این هدر برخی سرورهای S3 (مثل MinIO) خطای 411 می‌دهند
        "Content-Length": String(body.length),
      },
    });
    if (!response.ok) {
      throw new Error(`S3 PUT failed (${response.status}) for ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const response = await this.send(key, { method: "DELETE" });
    // S3 برای شیء ناموجود هم ۲۰۴ می‌دهد؛ ۴۰۴ را هم بی‌خطا می‌گیریم.
    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 DELETE failed (${response.status}) for ${key}`);
    }
  }

  publicUrl(key: string): string {
    assertValidKey(key);
    return `${this.publicBase}/${key}`;
  }

  keyFromUrl(url: string): string | null {
    const prefix = `${this.publicBase}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }
}
