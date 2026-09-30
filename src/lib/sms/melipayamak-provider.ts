import { describeMelipayamakError } from "./melipayamak-errors";
import { sanitizeSmsArg } from "./sanitize";
import type { SendPatternParams, SmsProvider, SmsSendResult } from "./types";

const ENDPOINT =
  "https://api.payamak-panel.com/post/send.asmx/SendByBaseNumber2";
const CREDIT_ENDPOINT =
  "https://api.payamak-panel.com/post/send.asmx/GetCredit";
const DELIVERY_ENDPOINT =
  "https://api.payamak-panel.com/post/send.asmx/GetDeliveries2";
const DEFAULT_TIMEOUT_MS = 10_000;

/** کدهای وضعیت تحویل ملی پیامک (راهنمای وب‌سرویس Send) */
export const DELIVERY_STATUSES: Record<string, string> = {
  "0": "ارسال‌شده به مخابرات (در انتظار)",
  "1": "رسیده به گوشی",
  "2": "نرسیده به گوشی",
  "3": "خطای مخابراتی",
  "5": "خطای نامشخص",
  "8": "رسیده به مخابرات",
  "16": "نرسیده به مخابرات",
  "35": "شماره در لیست سیاه",
  "100": "نامشخص",
  "200": "ارسال‌شده",
  "300": "فیلترشده",
  "400": "در صف ارسال",
  "500": "پذیرفته نشد",
};

/** recId موفق ۱۵+ رقمی است و کدهای خطا حداکثر ۴ کاراکترند. */
const RECORD_ID_PATTERN = /^\d{10,}$/;
/** پاسخ ASMX: `<string xmlns="http://tempuri.org/">مقدار</string>` */
const XML_STRING_PATTERN = /<string[^>]*>([^<]*)<\/string>/;

export interface MelipayamakConfig {
  username: string;
  /** رمز عبور یا ApiKey پنل (خطای -110 یعنی ApiKey لازم است) */
  password: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function failure(errorCode: string, errorMessage: string): SmsSendResult {
  return { ok: false, errorCode, errorMessage };
}

/** ارسال الگویی (پترن) با متد SendByBaseNumber2 — HTTP POST فرم‌کدشده. */
export class MelipayamakProvider implements SmsProvider {
  readonly name = "melipayamak" as const;

  constructor(private readonly config: MelipayamakConfig) {}

  async sendPattern({
    to,
    patternId,
    args,
  }: SendPatternParams): Promise<SmsSendResult> {
    if (!/^\d+$/.test(patternId)) {
      return failure(
        "INVALID_PATTERN_ID",
        "شناسه‌ی الگو (bodyId) تنظیم نشده یا عددی نیست",
      );
    }

    const body = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
      text: args.map(sanitizeSmsArg).join(";"),
      to,
      bodyId: patternId,
    });

    let response: Response;
    try {
      response = await (this.config.fetchImpl ?? fetch)(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(
          this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        ),
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return failure(
        isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        isTimeout
          ? "پاسخی از ملی پیامک نرسید"
          : "ارتباط با ملی پیامک برقرار نشد",
      );
    }

    if (!response.ok) {
      return failure(
        `HTTP_${response.status}`,
        "پاسخ HTTP نامعتبر از ملی پیامک",
      );
    }

    const value = XML_STRING_PATTERN.exec(await response.text())?.[1]?.trim();
    if (!value) {
      return failure("INVALID_RESPONSE", "قالب پاسخ ملی پیامک قابل تشخیص نیست");
    }
    // «خطا نداد» یعنی ارسال نشده؛ فقط recId بلند موفقیت است.
    if (RECORD_ID_PATTERN.test(value)) {
      return { ok: true, providerMessageId: value };
    }
    return failure(value, describeMelipayamakError(value));
  }

  /**
   * اعتبار پنل (برای «بررسی اتصال» در پنل مدیریت). پاسخ عددی مثبت = اعتبار؛
   * «0» یا کد منفی = خطا (نام کاربری/رمز، ApiKey، IP مجاز و …).
   */
  async getCredit(): Promise<
    { ok: true; credit: number } | { ok: false; errorMessage: string }
  > {
    let response: Response;
    try {
      response = await (this.config.fetchImpl ?? fetch)(CREDIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: this.config.username,
          password: this.config.password,
        }),
        signal: AbortSignal.timeout(
          this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        ),
      });
    } catch {
      return { ok: false, errorMessage: "ارتباط با ملی پیامک برقرار نشد" };
    }
    if (!response.ok) {
      return { ok: false, errorMessage: "پاسخ HTTP نامعتبر از ملی پیامک" };
    }
    const value =
      /<double[^>]*>([^<]*)<\/double>|<string[^>]*>([^<]*)<\/string>/.exec(
        await response.text(),
      );
    const raw = (value?.[1] ?? value?.[2] ?? "").trim();
    const credit = Number(raw);
    if (raw === "" || Number.isNaN(credit)) {
      return { ok: false, errorMessage: "قالب پاسخ ملی پیامک قابل تشخیص نیست" };
    }
    if (credit <= 0) {
      return {
        ok: false,
        errorMessage:
          raw === "0"
            ? "نام کاربری یا رمز نادرست است (یا اعتبار پنل صفر است)"
            : describeMelipayamakError(raw),
      };
    }
    return { ok: true, credit };
  }

  /** وضعیت تحویل یک پیامک ارسال‌شده (با recId) */
  async getDelivery(
    recId: string,
  ): Promise<
    | { ok: true; code: string; label: string }
    | { ok: false; errorMessage: string }
  > {
    let response: Response;
    try {
      response = await (this.config.fetchImpl ?? fetch)(DELIVERY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: this.config.username,
          password: this.config.password,
          recId,
        }),
        signal: AbortSignal.timeout(
          this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        ),
      });
    } catch {
      return { ok: false, errorMessage: "ارتباط با ملی پیامک برقرار نشد" };
    }
    const body = await response.text();
    const code = /<(?:int|string)[^>]*>([^<]*)<\//.exec(body)?.[1]?.trim();
    if (!response.ok || code === undefined || code === "") {
      return { ok: false, errorMessage: "پاسخ ملی پیامک قابل تشخیص نیست" };
    }
    const label = DELIVERY_STATUSES[code];
    if (label) return { ok: true, code, label };
    return { ok: false, errorMessage: describeMelipayamakError(code) };
  }
}
