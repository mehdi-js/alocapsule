import { appendFileSync } from "node:fs";

import type { SendPatternParams, SmsProvider, SmsSendResult } from "./types";

/**
 * فقط برای توسعه: پیامک را در ترمینال چاپ می‌کند و هزینه‌ای ندارد.
 * اگر `SMS_CONSOLE_OUTBOX` تنظیم شده باشد، هر پیامک یک خط JSON در آن فایل
 * هم نوشته می‌شود (تست‌های e2e کد OTP را از آن می‌خوانند).
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console" as const;

  async sendPattern({
    to,
    patternId,
    args,
    previewText,
  }: SendPatternParams): Promise<SmsSendResult> {
    console.log(
      `[SMS:console] to=${to} pattern=${patternId || "-"} args=${JSON.stringify(args)}` +
        (previewText ? `\n[SMS:console] text: ${previewText}` : ""),
    );
    const outbox = process.env.SMS_CONSOLE_OUTBOX;
    if (outbox) {
      appendFileSync(
        outbox,
        `${JSON.stringify({ to, patternId, args, text: previewText ?? null, at: new Date().toISOString() })}\n`,
      );
    }
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  }
}
