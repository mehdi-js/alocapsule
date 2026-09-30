import { logger } from "@/lib/logger";

/** ابزار مشترک route handlerهای آپلود (تصویر محصول، رسید پرداخت) */

export function json(body: object, status = 200): Response {
  return Response.json(body, { status });
}

/** درخواست cross-origin (که مرورگر Origin آن را می‌فرستد) رد می‌شود. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** بدنه را با سقف حجم می‌خواند؛ بیش از سقف ⇒ `null` (بدون بارگذاری کامل در حافظه). */
async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export type MultipartResult =
  { ok: true; form: FormData } | { ok: false; reason: "too_large" | "invalid" };

/** خواندن فرم multipart با سقف حجم کل بدنه */
export async function readMultipart(
  request: Request,
  maxBytes: number,
): Promise<MultipartResult> {
  const body = await readBodyLimited(request, maxBytes);
  if (body === null) return { ok: false, reason: "too_large" };
  try {
    const form = await new Response(Buffer.from(body), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    return { ok: true, form };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function logUploadFailure(event: string, error: unknown): void {
  logger.error(event, error);
}
