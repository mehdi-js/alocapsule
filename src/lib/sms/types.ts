export interface SendPatternParams {
  /** شماره‌ی موبایل نرمال‌شده (09XXXXXXXXX) */
  to: string;
  /** شناسه‌ی الگو (bodyId ملی پیامک) */
  patternId: string;
  /** مقادیر متغیرها، به ترتیب تعریف الگو */
  args: string[];
  /** متن کامل با مقادیر جایگذاری‌شده؛ فقط برای چاپ در حالت console */
  previewText?: string;
}

export type SmsSendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; errorCode: string; errorMessage: string };

export interface SmsProvider {
  readonly name: "console" | "melipayamak";
  /** هرگز throw نمی‌کند؛ هر شکستی در `ok: false` برمی‌گردد. */
  sendPattern(params: SendPatternParams): Promise<SmsSendResult>;
}
